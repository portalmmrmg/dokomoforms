#!/usr/bin/env python3

"""
This tornado server creates the client app by serving html/css/js and
it also functions as the wsgi container for accepting survey form post
requests back from the client app.
"""
import functools
import json
import urllib.parse
from tornado import httpclient

import tornado.web
import tornado.ioloop

import api.survey
import api.submission
import api.api_token
import api.user
from db.auth_user import verify_api_token, get_auth_user_by_email
from db.survey import AUTH_USER_ID
import settings
from utils.logger import setup_custom_logger


logger = setup_custom_logger('dokomo')


class BaseHandler(tornado.web.RequestHandler):
    """Common handler functions here (e.g. user auth, template helpers)"""

    def get_current_user(self):
        return self.get_secure_cookie('user')


class Index(BaseHandler):
    def get(self):
        survey = api.survey.get_one(settings.SURVEY_ID)  # XXX: get from url
        self.xsrf_token  # need to access it in order to set it...
        self.render('index.html', survey=json.dumps(survey))

    def post(self):
        data = json.loads(self.request.body.decode('utf-8'))
        self.write(api.submission.submit(data))


class FrontPage(BaseHandler):
    def get(self, *args, **kwargs):
        self.xsrf_token
        if self.get_current_user() is not None:
            self.render('profile-page.html')
        else:
            self.render('front-page.html')


''' 
Necessary for persona 
'''
class LoginHandler(tornado.web.RequestHandler):
    def get(self):
        self.redirect('/user/login')

    @tornado.web.asynchronous
    @tornado.gen.engine
    def post(self):
        assertion = self.get_argument('assertion')
        http_client = tornado.httpclient.AsyncHTTPClient()
        url = 'https://verifier.login.persona.org/verify'
        data = {'assertion': assertion, 'audience': 'localhost:8888'}
        response = yield tornado.gen.Task(
            http_client.fetch,
            url,
            method='POST',
            body=urllib.parse.urlencode(data),
        )
        data = tornado.escape.json_decode(response.body)
        if data['status'] != "okay":
            raise tornado.web.HTTPError(400, "Failed assertion test")
        api.user.create_user({'email': data['email']})
        self.set_secure_cookie('user', data['email'], expires_days=None,
                               # secure=True,
                               httponly=True
        )
        self.set_header("Content-Type", "application/json; charset=UTF-8")
        response = {'next_url': '/', 'email': data['email']}
        self.write(tornado.escape.json_encode(response))
        self.finish()


class LoginPage(BaseHandler):
    def get(self):
        self.xsrf_token
        self.render('login.html')


class PageRequiringLogin(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        self.xsrf_token
        self.render('requires-login.html')


def api_authenticated(method):
    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        if not self.current_user:
            token = self.request.headers['Token']
            email = self.request.headers['Email']
            if not verify_api_token(token=token, email=email):
                raise tornado.web.HTTPError(403)
        return method(self, *args, **kwargs)

    return wrapper


class SurveysAPI(BaseHandler):
    @api_authenticated
    def get(self):
        surveys = api.survey.get_all(
            {'email': self.current_user.decode('utf-8')})
        self.write(json.dumps(surveys))


class LogoutHandler(BaseHandler):
    def get(self):
        self.xsrf_token
        self.redirect('/user/login')

    def post(self):
        self.clear_cookie('user')


config = {
    'template_path': 'static',
    'static_path': 'static',
    'xsrf_cookies': True,
    'login_url': '/user/login',
    'cookie_secret': settings.COOKIE_SECRET,
    'debug': True  # Remove this
}


if __name__ == '__main__':
    app = tornado.web.Application([
        # Survey Submissions
        (r'/', Index), # Ebola front page
        
        # Dokomo App Homepage
        (r'/user/?', FrontPage), # Ideal front page

        # Auth
        (r'/user/login/?', LoginPage), #XXX: could be removed 
        (r'/user/login/persona/?', LoginHandler), # Post to persona by posting here
        (r'/user/logout/?', LogoutHandler),

        # Testing
        (r'/api/surveys/?', SurveysAPI),
        (r'/user/requires-login/?', PageRequiringLogin),
    ], **config)
    app.listen(settings.WEBAPP_PORT, '0.0.0.0')

    logger.info('starting server on port ' + str(settings.WEBAPP_PORT))

    tornado.ioloop.IOLoop.current().start()



"""API tests"""
from tornado.escape import json_decode, json_encode

from tests.util import DokoHTTPTest, setUpModule, tearDownModule

from dokomoforms.models import Submission, Survey, Node

utils = (setUpModule, tearDownModule)


"""
TODO:
- add exception and error response tests
    - add error tests for unauthenticated users
        - creating surveys
- add tests for total_entries and filtered_entries
"""

# The numbers expected to be present via fixtures
TOTAL_SURVEYS = 14
TOTAL_SUBMISSIONS = 112
TOTAL_NODES = 16


class TestSurveyApi(DokoHTTPTest):
    """
    These tests are made against the known fixture data.
    """

    def test_list_surveys(self):
        # url to test
        url = self.api_root + '/surveys'
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        # check that response is valid parseable json
        survey_dict = json_decode(response.body)

        # check that the expected keys are present
        self.assertTrue('surveys' in survey_dict)

        self.assertEqual(len(survey_dict['surveys']), TOTAL_SURVEYS)

        # check that no error is present
        self.assertFalse("error" in survey_dict)

    def test_list_surveys_with_offset(self):
        # url to test
        offset = 5
        url = self.api_root + '/surveys'
        query_params = {
            'offset': offset
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        # check that response is valid parseable json
        survey_dict = json_decode(response.body)

        # check that the offset value comes back correctly
        self.assertTrue("offset" in survey_dict)
        self.assertEqual(survey_dict['offset'], offset)

        self.assertEqual(len(survey_dict['surveys']), TOTAL_SURVEYS - offset)
        # TODO: check the known value of the first survey
        # in the offset response

    def test_list_surveys_with_limit(self):
        # url to test
        url = self.api_root + '/surveys'
        query_params = {
            'limit': 1
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response

        # check that response is valid parseable json
        survey_dict = json_decode(response.body)

        # check that the limit value comes back correctly
        self.assertTrue("limit" in survey_dict)
        self.assertEqual(survey_dict['limit'], 1)

        # check the number of surveys matches the limit
        self.assertEqual(len(survey_dict['surveys']), 1)

    def test_get_single_survey(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to tests
        url = self.api_root + '/surveys/' + survey_id
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        survey_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in survey_dict)
        self.assertTrue('created_on' in survey_dict)
        self.assertTrue('metadata' in survey_dict)
        self.assertTrue('title' in survey_dict)
        self.assertTrue('survey_type' in survey_dict)
        self.assertTrue('default_language' in survey_dict)
        self.assertTrue('deleted' in survey_dict)
        self.assertTrue('creator_name' in survey_dict)
        self.assertTrue('nodes' in survey_dict)
        self.assertTrue('last_update_time' in survey_dict)
        self.assertTrue('creator_id' in survey_dict)
        self.assertTrue('version' in survey_dict)

        self.assertFalse("error" in survey_dict)

    def test_get_single_survey_with_sub_surveys(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        survey_dict = json_decode(response.body)

        survey_node = survey_dict['nodes'][0]
        sub_surveys = survey_node['sub_surveys']
        sub_survey = sub_surveys[0]

        # check that expected keys are present
        self.assertTrue('sub_surveys' in survey_node)

        self.assertTrue('deleted' in sub_survey)
        self.assertTrue('buckets' in sub_survey)
        self.assertTrue('repeatable' in sub_survey)
        self.assertTrue('nodes' in sub_survey)

        self.assertFalse("error" in survey_dict)

    def test_nested_sub_surveys(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        survey_dict = json_decode(response.body)
        survey_node = survey_dict['nodes'][0]

        sub_surveys = survey_node['sub_surveys']
        sub_survey = sub_surveys[0]
        sub_sub_surveys = sub_survey['nodes'][0]['sub_surveys']
        sub_sub_survey = sub_sub_surveys[0]

        # check that expected keys are present
        self.assertTrue('sub_surveys' in survey_node)

        self.assertTrue('deleted' in sub_sub_survey)
        self.assertTrue('buckets' in sub_sub_survey)
        self.assertTrue('repeatable' in sub_sub_survey)
        self.assertTrue('nodes' in sub_sub_survey)

        self.assertFalse("error" in survey_dict)

    def test_create_survey_with_node_definition(self):
        # url to test
        url = self.api_root + '/surveys'
        # http method
        method = 'POST'
        # body
        body = {
            "metadata": {},
            "survey_type": "public",
            "default_language": "English",
            "title": {"English": "Test_Survey"},
            "nodes": [
                {
                    "title": {"English": "test_time_node"},
                    "hint": {
                        "English": ""
                    },
                    "allow_multiple": False,
                    "allow_other": False,
                    "type_constraint": "time",
                    "logic": {},
                    "deleted": False
                }
            ]
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        survey_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in survey_dict)
        self.assertTrue('metadata' in survey_dict)
        self.assertTrue('nodes' in survey_dict)
        self.assertTrue('title' in survey_dict)
        self.assertTrue('version' in survey_dict)
        self.assertTrue('created_on' in survey_dict)
        self.assertTrue('last_update_time' in survey_dict)

        self.assertFalse("error" in survey_dict)

    def test_create_survey_with_node_id(self):
        node_id = "60e56824-910c-47aa-b5c0-71493277b43f"
        # url to test
        url = self.api_root + '/surveys'
        # http method
        method = 'POST'
        # body
        body = {
            "metadata": {},
            "survey_type": "public",
            "default_language": "English",
            "title": {"English": "Test_Survey"},
            "nodes": [
                {
                    "id": node_id
                }
            ]
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        survey_dict = json_decode(response.body)
        survey_node = survey_dict['nodes'][0]

        # check that expected keys are present
        self.assertTrue('id' in survey_dict)
        self.assertTrue('metadata' in survey_dict)
        self.assertTrue('nodes' in survey_dict)
        self.assertTrue('title' in survey_dict)
        self.assertTrue('version' in survey_dict)
        self.assertTrue('created_on' in survey_dict)
        self.assertTrue('last_update_time' in survey_dict)

        self.assertEqual(
            survey_node['node_id'], "60e56824-910c-47aa-b5c0-71493277b43f")

        self.assertFalse("error" in survey_dict)

    def test_update_survey(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id
        # http method
        method = 'PUT'
        # body
        body = '{"survey_body_json"}'
        # make request
        response = self.fetch(url, method=method, body=body)
        # test response
        id(response)
        self.fail("Not yet implemented.")

    def test_delete_survey(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id
        # http method
        method = 'DELETE'
        # make request
        response = self.fetch(url, method=method)
        # test response
        # test response - successful DELETE returns 204 no content.
        self.assertEqual(response.code, 204)

        survey = self.session.query(Survey).get(survey_id)

        self.assertTrue(survey.deleted)

    def test_submit_to_survey(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "unauthenticated"
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

    def test_submit_to_survey_with_integer_answer_response(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "unauthenticated",
            "answers": [
                {
                    "survey_node_id": "60e56824-910c-47aa-b5c0-71493277b43f",
                    "type_constraint": "integer",
                    "response": {
                        "response_type": "answer",
                        "response": 3
                    }
                }
            ]
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        self.assertEqual(
            submission_dict['answers'][0]['response_type'], 'answer')
        self.assertEqual(submission_dict['answers'][0]['response'], 3)

    def test_submit_to_survey_with_multiple_choice_answer_response(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "unauthenticated",
            "answers": [
                {
                    "survey_node_id": "80e56824-910c-47aa-b5c0-71493277b439",
                    "type_constraint": "multiple_choice",
                    "response": {
                        "response_type": "answer",
                        "response": "11156824-910c-47aa-b5c0-71493277b439"
                    }
                }
            ]
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        # check answer
        self.assertEqual(
            submission_dict['answers'][0]['response_type'], 'answer')
        self.assertEqual(
            submission_dict['answers'][0]['response']['choice_number'], 1)
        self.assertEqual(
            submission_dict['answers']
            [0]['response']['choice_text']['English'], 'second choice')

    def test_submit_to_survey_with_other_response(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "unauthenticated",
            "answers": [
                {
                    "survey_node_id": "80e56824-910c-47aa-b5c0-71493277b439",
                    "type_constraint": "multiple_choice",
                    "response": {
                        "response_type": "other",
                        "response": "bwop"
                    }
                }
            ]
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        self.assertEqual(
            submission_dict['answers'][0]['response_type'], 'other')
        self.assertEqual(submission_dict['answers'][0]['response'], 'bwop')

    def test_submit_to_survey_with_dont_know_response(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "unauthenticated",
            "answers": [
                {
                    "survey_node_id": "80e56824-910c-47aa-b5c0-71493277b439",
                    "type_constraint": "multiple_choice",
                    "response": {
                        "response_type": "dont_know",
                        "response": "bwop"
                    }
                }
            ]
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        self.assertEqual(
            submission_dict['answers'][0]['response_type'], 'dont_know')
        self.assertEqual(submission_dict['answers'][0]['response'], 'bwop')

    def test_submit_to_public_survey_while_authenticated(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            # public survey, so unauthenticated submission type -- we'll check
            # that an enumerator_id comes back in the response
            "submission_type": "unauthenticated"
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        # The important part:
        self.assertTrue('enumerator_user_id' in submission_dict)
        self.assertTrue('enumerator_user_name' in submission_dict)

    def test_submit_to_enum_only_survey_while_authenticated(self):
        survey_id = 'c0816b52-204f-41d4-aaf0-ac6ae2970925'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "authenticated"
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

    def test_error_public_submission_to_enum_only_survey(self):
        survey_id = 'c0816b52-204f-41d4-aaf0-ac6ae2970925'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submit'
        # http method
        method = 'POST'
        # body
        body = {
            "submitter_name": "regular",
            "submission_type": "unauthenticated"
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('error' in submission_dict)

        self.assertEqual(response.code, 500)

    def test_list_submissions_to_survey(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/submissions'
        # http method
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        submission_list = json_decode(response.body)

        self.assertTrue('submissions' in submission_list)
        self.assertTrue('survey_id' in submission_list)

        self.assertFalse('error' in submission_list)

    def test_get_stats_for_survey(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/stats'
        # http method
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)

        stats = json_decode(response.body)

        # test response
        self.assertTrue("latest_submission_time" in stats)
        self.assertTrue("created_on" in stats)
        self.assertTrue("earliest_submission_time" in stats)
        self.assertTrue("num_submissions" in stats)
        self.assertFalse("error" in stats)

    def test_submission_activity_for_all_surveys(self):
        # url to test
        url = self.api_root + '/surveys/activity'
        # http method
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        activity = json_decode(response.body)
        self.assertTrue('activity' in activity)
        self.assertEqual(len(activity['activity']), 30)

        # test 'days' query param
        query_params = {
            'days': 10
        }
        url = self.append_query_params(url, query_params)
        response = self.fetch(url, method=method)
        activity = json_decode(response.body)
        self.assertTrue('activity' in activity)
        self.assertEqual(len(activity['activity']), 10)

    def test_submission_activity_for_single_surveys(self):
        survey_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/surveys/' + survey_id + '/activity'
        # http method
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        activity = json_decode(response.body)

        self.assertTrue('activity' in activity)
        self.assertEqual(len(activity['activity']), 30)

        # test 'days' query param
        query_params = {
            'days': 10
        }
        url = self.append_query_params(url, query_params)
        response = self.fetch(url, method=method)
        activity = json_decode(response.body)
        self.assertTrue('activity' in activity)
        self.assertEqual(len(activity['activity']), 10)

    # TODO: We probably eventually want surveys not to be totally public.
    # def test_survey_access_denied_for_unauthorized_user(self):
    #    # this survey is owned by a different creator
    #    survey_id = 'd0816b52-204f-41d4-aaf0-ac6ae2970923'

    #    # url to test
    #    url = self.api_root + '/surveys/' + survey_id
    #    # http method
    #    method = 'GET'
    #    # make request
    #    response = self.fetch(url, method=method)
    #    # test response
    #    self.assertTrue(response.code == 401)


class TestSubmissionApi(DokoHTTPTest):

    def test_list_submissions(self):
        # url to test
        url = self.api_root + '/submissions'
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        # check that response is valid parseable json
        submission_dict = json_decode(response.body)

        # check that the expected keys are present
        self.assertTrue('submissions' in submission_dict)
        self.assertEqual(
            len(submission_dict['submissions']), TOTAL_SUBMISSIONS)

        self.assertFalse("error" in submission_dict)

    def test_get_single_submission(self):
        submission_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/submissions/' + submission_id
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        self.assertFalse("error" in submission_dict)

    def test_create_public_submission(self):
        # url to test
        url = self.api_root + '/submissions'
        # http method
        method = 'POST'
        # body
        body = {
            "survey_id": "b0816b52-204f-41d4-aaf0-ac6ae2970923",
            "submitter_name": "regular",
            "submission_type": "unauthenticated"
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

    def test_create_public_submission_with_integer_answer(self):
        # url to test
        url = self.api_root + '/submissions'
        # http method
        method = 'POST'
        # body
        body = {
            "survey_id": "b0816b52-204f-41d4-aaf0-ac6ae2970923",
            "submitter_name": "regular",
            "submission_type": "unauthenticated",
            "answers": [
                {
                    "survey_node_id": "60e56824-910c-47aa-b5c0-71493277b43f",
                    "type_constraint": "integer",
                    "answer": 3
                }
            ]
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

        self.assertEqual(len(submission_dict['answers']), 1)

        self.assertEqual(
            submission_dict['answers'][0]['response'],
            3
        )

    def test_create_enum_only_submission(self):
        # url to test
        url = self.api_root + '/submissions'
        # http method
        method = 'POST'
        # body
        body = {
            "survey_id": "c0816b52-204f-41d4-aaf0-ac6ae2970925",
            "enumerator_user_id": "a7becd02-1a3f-4c1d-a0e1-286ba121aef3",
            "submitter_name": "regular",
            "submission_type": "authenticated"
        }
        # make request
        response = self.fetch(url, method=method, body=json_encode(body))

        submission_dict = json_decode(response.body)

        self.assertTrue('save_time' in submission_dict)
        self.assertTrue('deleted' in submission_dict)
        self.assertTrue('id' in submission_dict)
        self.assertTrue('submitter_email' in submission_dict)
        self.assertTrue('answers' in submission_dict)
        self.assertTrue('submitter_name' in submission_dict)
        self.assertTrue('last_update_time' in submission_dict)
        self.assertTrue('submission_time' in submission_dict)
        self.assertTrue('survey_id' in submission_dict)

    # TODO: This was deemed unnecessary, submissions should be created
    # one at a time.
    # def test_create_multiple_submissions(self):
    #    # url to test
    #    url = self.api_root + '/submissions/batch'
    #    # http method
    #    method = 'POST'
    #    # body
    #    body = '{"submission_body_json"}'
    #    # make request
    #    response = self.fetch(url, method=method, body=body)
    #    # test response
    #    self.fail("Not yet implemented.")

    def test_delete_submission(self):
        submission_id = 'b0816b52-204f-41d4-aaf0-ac6ae2970923'
        # url to test
        url = self.api_root + '/submissions/' + submission_id
        # http method
        method = 'DELETE'
        # make request
        response = self.fetch(url, method=method)
        # test response - successful DELETE returns 204 no content.
        self.assertEqual(response.code, 204)

        submission = self.session.query(Submission).get(submission_id)

        self.assertTrue(submission.deleted)


class TestNodeApi(DokoHTTPTest):

    def test_list_nodes(self):
        # url to test
        url = self.api_root + '/nodes'
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        node_dict = json_decode(response.body)
        # check that the expected keys are present
        self.assertTrue('nodes' in node_dict)

        self.assertEqual(len(node_dict['nodes']), TOTAL_NODES)

        # check that no error is present
        self.assertFalse("error" in node_dict)

    def test_list_nodes_with_limit(self):
        limit = 1
        # url to test
        url = self.api_root + '/nodes'
        query_params = {
            'limit': limit
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response

        node_dict = json_decode(response.body)

        self.assertTrue('nodes' in node_dict)
        self.assertTrue('limit' in node_dict)
        self.assertEqual(node_dict['limit'], limit)
        self.assertEqual(len(node_dict['nodes']), limit)

        # check that no error is present
        self.assertFalse("error" in node_dict)

    def test_list_nodes_with_offset(self):
        offset = 5
        # url to test
        url = self.api_root + '/nodes'
        query_params = {
            'offset': offset
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        node_dict = json_decode(response.body)

        self.assertTrue('nodes' in node_dict)
        self.assertTrue('offset' in node_dict)
        self.assertEqual(node_dict['offset'], offset)
        self.assertEqual(len(node_dict['nodes']), TOTAL_NODES - offset)

        # check that no error is present
        self.assertFalse("error" in node_dict)

    def test_list_nodes_with_title_search(self):
        search_term = 'integer'
        # url to test
        url = self.api_root + '/nodes'
        query_params = {
            'search': search_term,
            'search_fields': 'title'
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        id(response)
        # test response
        self.fail("Not yet implemented.")

    def test_list_nodes_with_type_filter(self):
        type_constraint = 'text'
        # url to test
        url = self.api_root + '/nodes'
        query_params = {
            'type': type_constraint
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        node_dict = json_decode(response.body)

        self.assertTrue('nodes' in node_dict)
        self.assertTrue('type' in node_dict)
        self.assertEqual(len(node_dict['nodes']), 1)
        self.assertEqual(
            node_dict['nodes'][0]['type_constraint'], type_constraint)

    def test_list_nodes_with_unknown_type_filter(self):
        type_constraint = 'wrong'
        # url to test
        url = self.api_root + '/nodes'
        query_params = {
            'type': type_constraint
        }
        # append query params
        url = self.append_query_params(url, query_params)
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        node_dict = json_decode(response.body)

        self.assertEqual(response.code, 500)
        self.assertTrue('error' in node_dict)

    def test_get_single_node(self):
        node_id = '60e56824-910c-47aa-b5c0-71493277b43f'
        # url to test
        url = self.api_root + '/nodes/' + node_id
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertFalse("error" in node_dict)

    def test_create_note_node(self):
        type_constraint = 'note'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": "test_time_node"},
            "type_constraint": type_constraint,
            "logic": {}
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_text_node(self):
        type_constraint = 'text'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_photo_node(self):
        type_constraint = 'text'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_integer_node(self):
        type_constraint = 'integer'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_decimal_node(self):
        type_constraint = 'decimal'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_date_node(self):
        type_constraint = 'date'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_time_node(self):
        type_constraint = 'time'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_timestamp_node(self):
        type_constraint = 'timestamp'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_location_node(self):
        type_constraint = 'location'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_facility_node(self):
        type_constraint = 'facility'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_create_multiple_choice_node(self):
        type_constraint = 'multiple_choice'
        # url to test
        url = self.api_root + '/nodes'
        # http method
        method = 'POST'
        # body
        body = {
            "title": {"English": type_constraint + "_node"},
            "hint": {
                "English": "Some test hint."
            },
            "allow_multiple": False,
            "allow_other": False,
            "type_constraint": type_constraint,
            "logic": {},
            "choices": [
                {
                    "choice_text": {
                        "English": "first choice"
                    }
                },
                {
                    "choice_text": {
                        "English": "second choice"
                    }
                }
            ]
        }

        encoded_body = json_encode(body)

        # make request
        response = self.fetch(url, method=method, body=encoded_body)

        # test response
        # check that response is valid parseable json
        node_dict = json_decode(response.body)

        # check that expected keys are present
        self.assertTrue('id' in node_dict)
        self.assertTrue('title' in node_dict)
        self.assertTrue('hint' in node_dict)
        self.assertTrue('allow_multiple' in node_dict)
        self.assertTrue('allow_other' in node_dict)
        self.assertTrue('logic' in node_dict)
        self.assertTrue('last_update_time' in node_dict)
        self.assertTrue('type_constraint' in node_dict)
        self.assertTrue('choices' in node_dict)
        self.assertEqual(len(node_dict['choices']), 2)

        self.assertEqual(node_dict['type_constraint'], type_constraint)

        self.assertFalse("error" in node_dict)

    def test_update_node(self):
        node_id = '60e56824-910c-47aa-b5c0-71493277b43f'
        # url to test
        url = self.api_root + '/nodes/' + node_id
        # http method
        method = 'PUT'
        # body
        body = {

        }
        encoded_body = json_encode(body)
        # make request
        response = self.fetch(url, method=method, body=encoded_body)
        id(response)
        # test response
        self.fail("Not yet implemented.")

    def test_delete_node(self):
        node_id = '60e56824-910c-47aa-b5c0-71493277b43f'
        # url to test
        url = self.api_root + '/nodes/' + node_id
        # http method
        method = 'DELETE'
        # make request
        response = self.fetch(url, method=method)
        # test response
        # test response - successful DELETE returns 204 no content.
        self.assertEqual(response.code, 204)

        survey = self.session.query(Node).get(node_id)

        self.assertTrue(survey.deleted)


class TestUserApi(DokoHTTPTest):

    def test_create_api_token(self):
        # url to test
        url = self.api_root + '/user/generate-api-token'
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        id(response)
        # test response
        self.fail("Not yet implemented.")

    def test_use_api_token(self):
        # url to test
        url = self.api_root + '/user/generate-api-token'
        # http method (just for clarity)
        method = 'GET'
        # make request
        response = self.fetch(url, method=method)
        id(response)
        # test response
        self.fail("Not yet implemented.")
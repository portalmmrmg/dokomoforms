var React = require('react');
var $ = require('jquery');

var ResponseField = require('./components/baseComponents/ResponseField.js');
var ResponseFields = require('./components/baseComponents/ResponseFields.js');
var BigButton = require('./components/baseComponents/BigButton.js');
var LittleButton = require('./components/baseComponents/LittleButton.js');
var DontKnow = require('./components/baseComponents/DontKnow.js');

var Title = require('./components/baseComponents/Title.js');
var Card = require('./components/baseComponents/Card.js');
var Select = require('./components/baseComponents/Select.js');
var FacilityRadios = require('./components/baseComponents/FacilityRadios.js');
var Message = require('./components/baseComponents/Message.js');

var Header = require('./components/Header.js');
var Footer = require('./components/Footer.js');
var Question = require('./components/Question.js'); 
var Note = require('./components/Note.js'); 
var MultipleChoice = require('./components/MultipleChoice.js'); 
var Location = require('./components/Location.js'); 
var Facility = require('./components/Facility.js'); 
var Submit = require('./components/Submit.js'); 
var Splash = require('./components/Splash.js'); 

var MultipleChoice = require('./components/MultipleChoice.js'); 
var Location = require('./components/Location.js'); 
var Facility = require('./components/Facility.js'); 
var Submit = require('./components/Submit.js'); 
var Splash = require('./components/Splash.js'); 

/* 
 * Create Single Page App with three main components
 * Header, Content, Footer
 */
var Application = React.createClass({
    getInitialState: function() {
        return { 
            showDontKnow: false,
            showDontKnowBox: false,
            nextQuestion: 0,
            states : {
                SPLASH : 1,
                QUESTION : 2,
                SUBMIT : 3,
            },
            state: 1,
        }
    },

    /*
     * Load next question, updates state of the Application
     * if next question is not found to either SPLASH/SUBMIT
     */
    onNextButton: function() {
        var questions = this.props.survey.nodes;
        var nextQuestion = this.state.nextQuestion + 1;
        var nextState = this.state.state;
        var numQuestions = this.props.survey.nodes.length;
        var showDontKnow = false;

        if (nextQuestion > 0 && nextQuestion < numQuestions) { 
            nextState = this.state.states.QUESTION;
            showDontKnow = questions[nextQuestion].allow_dont_know
        }

        if (nextQuestion == numQuestions) {
            nextState = this.state.states.SUBMIT
        }

        if (nextQuestion > numQuestions) {
            nextQuestion = 0
            nextState = this.state.states.SPLASH
            this.onSave();
        }


        this.setState({
            nextQuestion: nextQuestion,
            showDontKnow: showDontKnow,
            showDontKnowBox: false,
            state: nextState
        })

    },

    /*
     * Load prev question, updates state of the Application
     * if prev question is not found to SPLASH
     */
    onPrevButton: function() {
        var questions = this.props.survey.nodes;
        var nextQuestion = this.state.nextQuestion - 1;
        var nextState = this.state.state;
        var numQuestions = this.props.survey.nodes.length;
        var showDontKnow = false;
        
        if (nextQuestion < numQuestions && nextQuestion > 0) {
            nextState = this.state.states.QUESTION;
            showDontKnow = questions[nextQuestion].allow_dont_know
        }

        if (nextQuestion <= 0) { 
            nextState = this.state.states.SPLASH;
            nextQuestion = 0;
        }

        this.setState({
            nextQuestion: nextQuestion,
            showDontKnow: showDontKnow,
            showDontKnowBox: false,
            state: nextState
        })

    },

    /*
     * Save active survey into unsynced array 
     */
    onSave: function() {
        var survey = JSON.parse(localStorage[this.props.survey.id] || '{}');
        // Get all unsynced surveys
        var unsynced_surveys = JSON.parse(localStorage['unsynced'] || '{}');
        // Get array of unsynced submissions to this survey
        var unsynced_submissions = unsynced_surveys[this.props.survey.id] || [];

        // Build new submission
        var answers = []; 
        this.props.survey.nodes.forEach(function(question) {
            var responses = survey[question.id] || [];
            responses.forEach(function(response) {
                answers.push({
                    survey_node_id: question.id,
                    response: response,
                    type_constraint: question.type_constraint
                });
            });

        });

        // Don't record it if there are no answers, will mess up splash 
        if (answers.length === 0) {
            return;
        }

        var submission = {
            submitter_name: localStorage['submitter_name'] || "anon",
            submitter_email: localStorage['submitter_email'] || "anon@anon.org",
            submission_type: "unauthenticated", //XXX 
            survey_id: this.props.survey.id,
            answers: answers,
            save_time: new Date().toISOString(),
            submission_time: "" // For comparisions during submit ajax callback
        }

        console.log("Submission", submission);

        // Record new submission into array
        unsynced_submissions.push(submission);
        unsynced_surveys[this.props.survey.id] = unsynced_submissions;
        localStorage['unsynced'] = JSON.stringify(unsynced_surveys);

        // Wipe active survey
        localStorage[this.props.survey.id] = JSON.stringify({});

    },

    onSubmit: function() {
        function getCookie(name) {
            var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
            return r ? r[1] : undefined;
        }
        
        var self = this;

        // Get all unsynced surveys
        var unsynced_surveys = JSON.parse(localStorage['unsynced'] || '{}');
        // Get array of unsynced submissions to this survey
        var unsynced_submissions = unsynced_surveys[this.props.survey.id] || [];

        unsynced_submissions.forEach(function(survey) {
            // Update submit time
            survey.submission_time = new Date().toISOString();
            $.ajax({
                url: '/api/v0/surveys/'+survey.survey_id+'/submit',
                type: 'POST',
                contentType: 'application/json',
                processData: false,
                data: JSON.stringify(survey),
                headers: {
                    "X-XSRFToken": getCookie("_xsrf")
                },
                dataType: 'json',
                success: function(survey, anything, hey) {
                    console.log("success", anything, hey);

                    survey.submission_time = "";
                    // Get all unsynced surveys
                    var unsynced_surveys = JSON.parse(localStorage['unsynced'] || '{}');
                    // Get array of unsynced submissions to this survey
                    var unsynced_submissions = unsynced_surveys[survey.survey_id] || [];

                    //XXX DOES NOT WORK, RESPONSE IS DIFFERENT THEN SUBMISSION
                    var idx = unsynced_submissions.indexOf(survey);
                    console.log(idx, unsynced_submissions.length);
                    unsynced_submissions.splice(idx, 1);

                    unsynced_surveys[survey.survey_id] = unsynced_submissions;
                    localStorage['unsynced'] = JSON.stringify(unsynced_surveys);
                },
                error: function(err) {
                    console.log("error", err, survey);
                }
            });

            console.log('synced submission:', survey);
            console.log('survey', '/api/v0/surveys/'+survey.survey_id+'/submit');
        });
    },


    /*
     * Respond to don't know checkbox event, this is listend to by Application
     * due to app needing to resize for the increased height of the don't know
     * region
     */
    onCheckButton: function() {
        this.setState({
            showDontKnowBox: this.state.showDontKnowBox ? false: true,
        });
    },

    /*
     * Load the appropiate question based on the nextQuestion state
     * Loads splash or submit content if state is either SPLASH/SUBMIT 
     */
    getContent: function() {
        var questions = this.props.survey.nodes;
        var nextQuestion = this.state.nextQuestion;
        var state = this.state.state;
        var survey = this.props.survey;

        if (state === this.state.states.QUESTION) {
            var questionType = questions[nextQuestion].type_constraint;
            switch(questionType) {
                case 'multiple_choice':
                    return (
                            <MultipleChoice 
                                key={nextQuestion} 
                                question={questions[nextQuestion]} 
                                questionType={questionType}
                                language={survey.default_language}
                                surveyID={survey.id}
                           />
                       )

                case 'location':
                    return (
                            <Location
                                key={nextQuestion} 
                                question={questions[nextQuestion]} 
                                questionType={questionType}
                                language={survey.default_language}
                                surveyID={survey.id}
                           />
                       )
                case 'facility':
                    return (
                            <Facility
                                key={nextQuestion} 
                                question={questions[nextQuestion]} 
                                questionType={questionType}
                                language={survey.default_language}
                                surveyID={survey.id}
                           />
                       )
                case 'note':
                    return (
                            <Note
                                key={nextQuestion} 
                                question={questions[nextQuestion]} 
                                questionType={questionType}
                                language={survey.default_language}
                                surveyID={survey.id}
                           />
                       )
                default:
                    return (
                            <Question 
                                key={nextQuestion} 
                                question={questions[nextQuestion]} 
                                questionType={questionType}
                                language={survey.default_language}
                                surveyID={survey.id}
                           />
                       )
            }
        } else if (state === this.state.states.SUBMIT) {
            return (
                    <Submit
                        surveyID={survey.id}
                        language={survey.default_language}
                    />
                   )
        } else {
            return (
                    <Splash 
                        surveyID={survey.id}
                        language={survey.default_language}
                        buttonFunction={this.onSubmit}
                    />
                   )
        }
    },

    /*
     * Load the appropiate title based on the nextQuestion and state
     */
    getTitle: function() {
        var questions = this.props.survey.nodes;
        var survey = this.props.survey;
        var nextQuestion = this.state.nextQuestion;
        var state = this.state.state;

        if (state === this.state.states.QUESTION) {
            return questions[nextQuestion].title[survey.default_language] 
        } else if (state === this.state.states.SUBMIT) {
            return "Ready to Save?"
        } else {
            return survey.title[survey.default_language] 
        }
    },

    /*
     * Load the appropiate 'hint' based on the nextQuestion and state
     */
    getMessage: function() {
        var questions = this.props.survey.nodes;
        var survey = this.props.survey;
        var nextQuestion = this.state.nextQuestion;
        var state = this.state.state;

        if (state === this.state.states.QUESTION) {
            return questions[nextQuestion].hint[survey.default_language] 
        } else if (state === this.state.states.SUBMIT) {
            return "If youre satisfied with the answers to all the questions, you can save the survey now."
        } else {
            return "version " + survey.version + " | last updated " + survey.last_updated_time;
        }
    },

    /*
     * Load the appropiate text in the Footer's button based on state
     */
    getButtonText: function() {
        var state = this.state.state;
        if (state === this.state.states.QUESTION) {
            return "Next Question";
        } else if (state === this.state.states.SUBMIT) {
            return "Save Survey"
        } else {
            return "Begin a New Survey"
        }
    },

    render: function() {
        var contentClasses = "content";
        var state = this.state.state;
        var nextQuestion = this.state.nextQuestion;
        var questions = this.props.survey.nodes;
        var questionID = questions[nextQuestion] && questions[nextQuestion].id 
            || this.state.state;


        // Alter the height of content based on DontKnow state
        if (this.state.showDontKnow) 
            contentClasses += " content-shrunk";

        if (this.state.showDontKnowBox) 
            contentClasses += " content-shrunk content-super-shrunk";

        return (
                <div id="wrapper">
                    <Header buttonFunction={this.onPrevButton} 
                        number={nextQuestion}
                        total={questions.length}
                        splash={state === this.state.states.SPLASH}/>
                    <div className={contentClasses}>
                        <Title title={this.getTitle()} message={this.getMessage()} />
                        {this.getContent()}
                    </div>
                    <Footer 
                        showDontKnow={this.state.showDontKnow} 
                        showDontKnowBox={this.state.showDontKnowBox} 
                        buttonFunction={this.onNextButton}
                        checkBoxFunction={this.onCheckButton}
                        buttonType={state === this.state.states.QUESTION 
                            ? 'btn-primary': 'btn-positive'}
                        buttonText={this.getButtonText()}
                        questionID={questionID}
                     />

                </div>
               )
    }
});

init = function(survey) {
    React.render(
            <Application survey={survey}/>,
            document.body
    );
};

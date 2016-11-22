import React from 'react';
import NodeList from './Node.babel.js';
import SubSurvey from './SubSurvey.babel.js';

class Survey extends React.Component {

    constructor(props) {
        super(props);

        this.updateTitle = this.updateTitle.bind(this);
        this.updateNodeList = this.updateNodeList.bind(this);
        this.submit = this.submit.bind(this);

        this.state = {
            title: '',
            hint: '',
            default_language: 'English',
            survey_type: '',
            nodes: []
        }
    }

    updateTitle(event) {
        this.setState({title: event.target.value});
    }

    updateNodeList(node, index) {
        console.log('update nodelist being called', node, index)
        console.log('this state nodes', this.state.nodes)
        let nodelist = [];
        nodelist = nodelist.concat(this.state.nodes);
        node.saved = true;
        console.log('nodelist before', nodelist)
        if (index < 0) nodelist.push(node)
        else nodelist[index] = node;
        console.log('nodeList', nodelist);
        this.setState({nodes: nodelist})
    }

    submit() {
        console.log('being called?')
        const newSurvey = {
            title: this.state.title,
            default_language: this.default_language,
            nodes: this.state.nodes
        }
        console.log('before submitting', newSurvey);
    }


    render() {
        let displaytitle = 'Define Your Survey';
        return ( 
            <div>
                {displaytitle}
                <SurveyTitle updateTitle={this.updateTitle} />
                <NodeList
                    nodes={this.state.nodes}
                    default_language={this.state.default_language}
                    updateNodeList={this.updateNodeList}
                    language={this.state.default_language}
                />
                <button onClick={this.submit}>submit</button>
            </div>
        );
    }

}

class SurveyTitle extends React.Component {

    render() {
        return (
            <div>
                <input type="text" onBlur={this.props.updateTitle} />
            </div>
        );
    }
}

class DefaultLanguage extends React.Component {

    render() {
        return (
            <div>
                <input type="text" onBlur={this.props.updateDefault} />
            </div>
        );
    }
}

export default Survey;
import React from 'react';
import uuid from 'node-uuid';
import $ from 'jquery';
import utils from './../utils.js'


class NodeList extends React.Component {

    constructor(props) {

        super(props);

        this.listQuestions = this.listQuestions.bind(this);
        this.addQuestion = this.addQuestion.bind(this);
        this.addOrUpdateNode = this.addOrUpdateNode.bind(this);
        
        this.state = {
            newNode: null
        }
    }


    componentWillMount() {
        console.log('component will mount');
        console.log('this nodes', this.props.nodes);
        if (this.props.nodes && this.props.nodes.length < 1) {
            let newNode = {
                id: uuid.v4(),
                node: {}
            };
            console.log('newNodeId', newNode.id)
            this.setState({newNode})
        }
    }


    listQuestions() {
        console.log(this.props.nodes)
        const self = this;

        let rows = [];
        rows = rows.concat(this.props.nodes);
        console.log('rows', rows);
        console.log('props nodes', this.props.nodes);
        if (this.state.newNode) rows.push(this.state.newNode); 
        return rows.map(function(node) {
            return (
                <Node
                    key={node.id}
                    data={node.node}
                    default_language={self.props.default_language}
                    addOrUpdateNode={self.addOrUpdateNode}
                    language={self.props.language}
                />
            )
        })
    }


    addQuestion() {
        if (this.state.newNode==null) {
            let newNode = {id: uuid.v4()};
            this.setState({newNode: newNode}, function(){
                console.log('new question added', this.state.newNode);
            });
        } else {
            console.log('you should already have an empty question');
        }
    }


    addOrUpdateNode(node, index) {
        if (this.state.newNode && node.id==this.state.newNode.id) {
            console.log('adding node', node, index, -1);
            this.props.updateNodeList(node, -1);
            this.setState({newNode: null}, function() {
                console.log('cleared node');
            })
        } else if (this.props.nodes[index].id==node.id) {
            console.log('index was id')
            console.log('updating node', node, index);
            this.props.updateNodeList(node, index);
        } else {
            let i;
            for (i=0; i<this.props.nodes.length-1; i++) {
                if (this.node.id==this.props.nodes[i].id) {
                    console.log('index was not id');
                    console.log('index', index, 'actual index', i);
                    this.props.updateNodeList(node, i)
                }
            }
        }
    }


    render() {
        console.log('rendering nodelist', this.props.nodes)
        return (
            <div className="container">
                <div className="row">
                    <div className="col-md-9 node-list center-block">
                        {this.listQuestions()}
                        <button 
                            onClick={this.addQuestion}
                            disabled={this.state.newNode}
                        >Add Question</button>
                    </div>
                </div>
            </div>
        );
    }
}


class Node extends React.Component {

    // Node is currently referring to the full node object that contains the question
    // and the associated sub-surveys

    constructor(props) {
        super(props);

        this.getTitleOrHintValue = this.getTitleOrHintValue.bind(this);
        this.updateTitle = this.updateTitle.bind(this);
        this.updateHint = this.updateHint.bind(this);
        this.addTypeConstraint = this.addTypeConstraint.bind(this);
        this.listChoices = this.listChoices.bind(this);
        this.addChoice = this.addChoice.bind(this);
        this.saveNode = this.saveNode.bind(this);

        this.state = {
            enableAddChoice: false,
            title: '',
            hint: '',
            type_constraint: '',
            choices: []
        }
    }


    getTitleOrHintValue(property) {
        if (!this.props.data.title) return '';
        else return this.props.data[property][this.props.default_language]
    };


    updateTitle(event) {
        let prevTitle = this.getTitleOrHintValue('title');
        // check if title input is the same as props title
        if (event.target.value===prevTitle) return;
        // check if title input is the same as current state title
        if (event.target.value===this.state.title) return;

        let titleObj = {};
        titleObj[this.props.default_language] = event.target.value;
        this.setState({title: titleObj}, function() {
            console.log('updated title', this.state.title);
            let properties = this.state.title;
            this.saveNode();
        });
    }

    updateHint(event) {
        let prevHint = this.getTitleOrHintValue('hint');
        // check if title input is the same as props title
        if (event.target.value===prevHint) return;
        // check if title input is the same as current state title
        if (event.target.value===this.state.title) return;

        let hintObj = {};
        hintObj[this.props.default_language] = event.target.value;
        this.setState({hint: hintObj}, function() {
            console.log('updated hint', this.state.hint);
            let properties = this.state.hint;
            this.saveNode();
        });
    }


    addTypeConstraint(event) {
        this.setState({type_constraint: event.target.value})
    }

    addChoice(id, event) {
        console.log('initial choice state', this.state.choices);
        console.log('id', id);
        console.log('event', event.target)
        let updated = false;
        let choiceList = [];
        choiceList = choiceList.concat(this.state.choices);
        // if add choice was clicked
        if (id===-1) {
            console.log('its -1');
            let newChoice = {id: utils.addId('choice')};
            newChoice[this.props.default_language]='';
            choiceList.push(newChoice);
            updated = true;
            console.log('new choiceList', choiceList);
        // if adding the first choice in list
        } else if (!choiceList.length) {
            console.log('empty choiceList', choiceList);
            let newChoice = {
                id: id, 
                [this.props.default_language]: event.target.value
            }
            choiceList.push(newChoice);
            updated = true;
            console.log('its adding');
        } else {
            for (var i = 0; i<choiceList.length; i++) {
                console.log('first', choiceList[i].id, id)
                // if updating and existing choice
                if (choiceList[i].id===id) {
                    console.log(choiceList[i][this.props.default_language], event.target.value)
                    console.log('its updating')
                    choiceList[i][this.props.default_language]=event.target.value;
                    updated = true;
                    break;
                    console.log('after update');
                }
            }
        }
        if (updated===true) {
            this.setState({choices: choiceList}, function(){
                console.log('choice state is now updated', this.state.choices);
            });
        }
    }

    listChoices(){
        console.log('rerendering list!!');

        let self = this;
        let choices = this.state.choices;
        let answer;

        if (!choices.length) {
            let newChoice = {id: utils.addId('choice')};
            newChoice[this.props.default_language] = '';
            choices.push(newChoice);
        }

        console.log('choices before rendering', choices)
        return choices.map(function(choice, i){
            answer = choice[self.props.default_language];
            return(<Choice
                key={choice.id} 
                index={i+1}
                answer={answer} 
                addChoice={self.addChoice.bind(null, choice.id)}
            />)
        })
    }
    

    deleteNode() {
        if (this.props.node.saved==false) {}
    }


    saveNode() {
        let node = this.state;
        delete node['isDisabled'];
        delete node['sub_surveys'];
        if (JSON.stringify(node)===JSON.stringify(this.props.data.node)) return;

        console.log('reassigning node');
        console.log('node', node);
        console.log(this.props.data);
        let updatedNode = Object.assign(this.props.data, node);
        console.log('updatedNode', updatedNode);
        this.setState({isDisabled: false});
    }


    render() {

        let displayTitle = this.getTitleOrHintValue('title');
        let displayHint = this.getTitleOrHintValue('hint');

        return (
            <div>
                <div className="form-group row">
                    <label htmlFor="question-title" className="col-xs-2 col-form-label">Question:</label>
                </div>
                <div className="form-group row col-xs-12">
                    <textarea className="form-control question-title" rows="1" displayTitle={displayTitle}
                    onBlur={this.updateTitle}/>
                </div>
                <div className="form-group row">
                    <label htmlFor="question-type" className="col-xs-2 col-form-label">Question Type:</label>
                    <div className="col-xs-2">
                        <select className="form-control type-constraint" onChange={this.addTypeConstraint}>
                            <option value="text">text</option>
                            <option value="photo">photo</option>
                            <option value="integer">integer</option>
                            <option value="decimal">decimal</option>
                            <option value="date">date</option>
                            <option value="time">time</option>
                            <option value="timestamp">timestamp</option>
                            <option value="location">location</option>
                            <option value="facility">facility</option>
                            <option value="multiple_choice">multiple choice</option>
                            <option value="note">note</option>
                        </select>
                    </div>
                    <label htmlFor="question-hint" className="col-xs-2 col-form-label">Hint:</label>
                    <div className="form-group col-xs-6">
                        <textarea className="form-control hint-title" rows="1" displayTitle={displayHint}
                        onBlur={this.updateHint}/>
                    </div>
                </div>

                {(this.state.type_constraint==="multiple_choice") &&
                    <div style={{backgroundColor:'#00a896'}}>
                        <h2>multiple choice</h2>
                        {this.listChoices()}
                        <button id="new-choice"
                            value="new choice"
                            onClick={this.addChoice.bind(null, -1)}
                            disabled={false}
                        >add choice</button>
                    </div>
                }

                <button onClick={this.deleteNode}>delete</button>
                <button onClick={this.saveNode}>save</button>
            </div>
        );
    }
}


function Choice(props) {

    buttonHandler(event) {
        if (!this.props.enabled && event.target.value.length ||
            this.props.enabled && !event.target.value.length) {
                props.changeAddChoice()
        }
    }

    choiceHandler(event) {
        console.log(props.answer, event.target.value)
        if (event.target.value===props.answer) return;
        else props.addChoice(event);
    }

    return(
        <div className="form-group" style={{backgroundColor:'#02c39a'}}>
            <div className="row">
                <label htmlFor="question-title" className="col-xs-2 col-form-label">{props.index}.</label>
                <div className="col-xs-10">
                    <textarea id="choice-text" className="form-control question-title" rows="1" defaultValue={props.answer} onInput={buttonHandler} onBlur={choiceHandler}/>
                </div>
            </div>
            <button>delete</button>
        </div>
    )

}

// onClick={() => choiceHandler(this.id)}
export default NodeList;
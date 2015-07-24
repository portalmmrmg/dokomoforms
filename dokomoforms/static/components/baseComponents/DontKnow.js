var React = require('react'); 

/*
 * Don't know component
 *
 * props:
 *  @checkBoxFunction: What to do on click event
 */
module.exports = React.createClass({
    render: function() {
        return (
                <div className="question__btn__other">
                    <input 
                        onClick={this.props.checkBoxFunction}
                        type="checkbox" 
                        id="dont-know" 
                        name="dont-know" 
                        value="selected" 
                    />
                    <label htmlFor="dont-know">I don't know the answer</label>
                </div>
               )
    }
});


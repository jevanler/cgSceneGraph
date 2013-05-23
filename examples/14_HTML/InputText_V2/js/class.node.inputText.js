/*
 * Copyright (c) 2012  Capgemini Technology Services (hereinafter “Capgemini”)
 *
 * License/Terms of Use
 *
 * Permission is hereby granted, free of charge and for the term of intellectual property rights on the Software, to any
 * person obtaining a copy of this software and associated documentation files (the "Software"), to use, copy, modify
 * and propagate free of charge, anywhere in the world, all or part of the Software subject to the following mandatory conditions:
 *
 *   •    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 *  Any failure to comply with the above shall automatically terminate the license and be construed as a breach of these
 *  Terms of Use causing significant harm to Capgemini.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 *  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 *  OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 *  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 *  Except as contained in this notice, the name of Capgemini shall not be used in advertising or otherwise to promote
 *  the use or other dealings in this Software without prior written authorization from Capgemini.
 *
 *  These Terms of Use are subject to French law.
 */

/**
 * This make a spinner component which is composed of a minus button, plus button and a counter screen.
 *
 * @class CGSGInputTextNode
 * @module Node
 * @extends CGSGNode
 * @constructor
 * @param {Number} x relative position
 * @param {Number} y relative position
 * @param {Number} width Relative dimension
 * @param {Number} height Relative Dimension
 * @param {Integer} size The size of the counter
 * @param {Integer} step The step value to increase or decrease
 * @param {Integer} start The starting value of the spinner.
 * @param {Integer} min The min value that is possible to reach
 * @param {Integer} max The max value that is possible to reach
 * @type {CGSGSpinnerNode}
 * @author jeremy vanlerberghe
 */
var CGSGInputTextNode = CGSGNode.extend(
    {
        initialize:function (x, y, w, h) {

            //call the constructor of CGSGNode
            this._super(x, y, w, h);

            // define an identifier like html forms
            this.id = undefined;

            // this give the location of the cursor among the letters, for instance : a|b give 1
            this.cursorLocation = 0;

            this.font = "arial";

            this.fontSize = "16";

            /**
             * Define the class type.
             * Not mandatory but very useful, as Javascript does not have a mechanism to manage the type of class
             * @type {String}
             */
            this.classType = "InputTextNode";

            this.isDraggable = false;

            this.toLowerCase = false;

            this.toUpperCase = false;

            //Specifies that element should automatically get focus when the page loads
            this.autoFocus = false;

            this.cursorPadding = 10;

            // Specifies the maximum number of characters allowed
            this.maxlength = 10;

            this.disabled = false;

            // display or not the placeHolder
            this.displayPlaceHolder = true;

            this.onClick = this.onClickHandler;

            this.traverser = new CGSGTraverser();

            // used by text selection.
            this.selectionStartPosition = undefined;
            this.selectionEndPosition = undefined;
            this.oldCursorPosition = undefined;

            //TODO : WARNING pour un clavier virtuel, ces evenement sont ils encore valable ??
            window.document.addEventListener("keypress", this.keypressHandler.bind(this), false);
            window.document.addEventListener("keydown", this.keydownHandler.bind(this), false);

            // represent the cursor (80% of the input text height)
            this.cursor = new CursorNode(this.cursorPadding, (0.3 * this.dimension.height) /2, 2, 0.7 * this.dimension.height);

            // this node represent the text hit by the user
            this.textNode = new CGSGNodeText(this.cursorPadding, this.cursor.position.y, '');
            this.textNode.color = "black";
            this.textNode.setSize(this.fontSize);
            this.textNode.setTypo(this.font);
            this.textNode.isTraversable = false;
            this.addChild(this.textNode);

            // Specifies a short hint that describes the expected value
            this.placeholder = new CGSGNodeText(this.cursorPadding, this.cursor.position.y, 'hit something');
            this.placeholder.color = "#959595";
            this.placeholder.setSize(this.fontSize);
            this.placeholder.setTypo("italic");// + this.font;
            this.placeholder.isTraversable = false;
            this.addChild(this.placeholder);

            // this node represent the placeHolder text that informs the user on which type of data we are waiting for.
            this.selectedTextNode = new TextSelectionNode(0, this.cursor.position.y, this.dimension.width, this.cursor.dimension.height);
            this.selectedTextNode.isTraversable = false;
            this.addChild(this.selectedTextNode);

            // fake canvas to pre-render static display
            this._tmpCanvas = null;
            this._initShape();

        },

        onClickHandler : function(event) {

            // input text must be enable to get cursor !
            if (!this.disabled) {
                // find all cursor (normally only one !) in the graph
                var cursors = this.traverser.traverse(this, function(node) { return node.classType == "CursorNode"; }, null);

                // check if cursor is already add !!
                if (cursors.length == 0) {
                    this.addChild(this.cursor);
                } else {
                    // move cursor to the click position
                    this.computeCursorLocation(event.position[0], cursors[0]);
                    // reset selection if exist
                    this.selectedTextNode.reset();
                }
            }

        },

        // TODO: maybe make this into the move cursor with a new type like 'position'
        computeCursorLocation : function(position, cursor) {
            var xrelatif = position.x - this.position.x;

            var index = 9;
            var i = 0;
            var w;

            do {
                w = this.computeTextWidth(this.textNode._text.charAt(i));
                index += w;
                i++;
            } while(index < xrelatif && i <= this.textNode._text.length);

            // correct the cursor because we exceed the limit !
            index -= w;
            // update cursor location
            this.cursorLocation = i-1;

            cursor.translateTo(index, cursor.position.y);

        },

        keypressHandler : function(e) {
            /**
             * In keypress event, only get "which" code and not "keyCode"
             * attribute else there are some conflict with code 32
             * that represent a "pourcent" but also the "left arrow"
             */
            var which = e.which;

            if (which != 0) {
                var letter = this.getChar(which);
                var text = '';

                // check if its still possible to add text
                if ( (this.maxlength == -1 || this.textNode._text.length < this.maxlength ) && !this.disabled) {
                    // key pressed is 'alphanumeric'
                    if ( which >= 32 && which <= 126 ) {

                        letter = this.toLowerCase ? letter.toLowerCase() : letter;
                        letter = this.toUpperCase ? letter.toUpperCase() : letter;

                        // if the cursor position is not at the end of the text (somewhere)
                        if (this.cursorLocation+1 < this.textNode._text.length) {
                            // we have to add the letter between the others
                            var json = this.splitText(0, 0);
                            text = this.textNode._text = json.firstPart + letter + json.secondPart;
                            this.textNode.setText(text, false);
                        } else {
                            text = this.textNode._text += letter;
                            this.textNode.setText(text, false);
                        }
                        this.moveCursor("right", false);
                    }
                }
                // display or not the placeHolder
                this.displayPlaceHolder = !!this.textNode._text.length == 0;

                this._initShape();
            }
        },


        keydownHandler : function(e) {

            var keycode = this.getKeyCode(e);
            var text = '';

            // key pressed is backspace, intercept it in order to don't go back in the browser
            if (keycode === 8) {
                e.preventDefault();
                var json = this.splitText(1, 0);
                this.moveCursor("left", false);
                text = json.firstPart + json.secondPart;
                this.textNode.setText(text, false);
            }

            // TODO : gerer le CTRL + ARROW pour bouger le curseur de mot à mot !

            switch(keycode) {
                /* Arrow */
                case 37: // left
                    this.moveCursor("left", this.isShift(e));
                    return false;

                case 39: // right
                    this.moveCursor("right", this.isShift(e));
                    return false;

                case 46: // del
                    if (this.cursorLocation < this.textNode._text.length) {
                        // if there is a selection, so delete the selected text
                        if (this.selectedTextNode.indexSelection != 0) {
                            json = this.splitText(0, this.selectedTextNode.text.length);
                            text = json.firstPart + json.secondPart;
                            this.textNode.setText(text, false);
                            this.selectedTextNode.reset();
                        } else {
                            // only delete one letter
                            json = this.splitText(0, 1);
                            text = json.firstPart + json.secondPart;
                            this.textNode.setText(text, false);
                        }
                        this._initShape();
                    }
                    return false;
            }

            this._initShape();
        },

        /**
         * This function split the text into two part from the cursor position
         * and can remove some letter in the given direction.
         * @param leftStep number of character to remove to the left
         * @param rightStep number of character to remove to the right
         * @return {Object} json parts
         */
        splitText : function(leftStep, rightStep) {

            var firstpart = this.textNode._text.substr(0, this.cursorLocation - leftStep);
            var secondpart = this.textNode._text.substr(this.cursorLocation + rightStep);

            return {firstPart : firstpart, secondPart : secondpart};
        },

        /**
         * This function move the cursor in the given direction !
         *
         * @param actionType the direction to move the cursor
         * @param isSelected if shift key is pressed, move cursor make a selection style
         */
        moveCursor : function(actionType, isSelected) {
            // we get the size of the given letter
            var code = '';
            var w = 0;

            var textLength = this.textNode._text.length;

            if (actionType === "left") {

                // check if it is possible to move cursor to the left. (cursor is not at the beginning of the text)
                if (this.cursorLocation > 0) {
                    this.cursorLocation --;
                    code = this.textNode._text.charAt(this.cursorLocation);
                    w = this.computeTextWidth(code);

                    if (isSelected) {

                        if (this.selectedTextNode.indexSelection > 0) {
                            this.selectedTextNode.text = this.selectedTextNode.text.substring(0, this.selectedTextNode.text.length-1);
                        } else {
                            this.selectedTextNode.text += code;
                            this.selectedTextNode.translateTo((this.cursor.position.x - w), this.cursor.position.y);
                        }
                        this.selectedTextNode.indexSelection --;
                        this.selectedTextNode._initShape();
                    } else {
                        this.selectedTextNode.reset();
                    }
                    this.cursor.translateWith(-w, 0);
                } else if(!isSelected) {
                    this.selectedTextNode.reset();
                }

            } else if (actionType === "right") {

                // check if it is possible to move cursor to the right. (cursor is not at the end of the text)
                if (this.cursorLocation < textLength) {
                    code = this.textNode._text.charAt(this.cursorLocation);
                    w = this.computeTextWidth(code);

                    if (isSelected) {
                        if (this.selectedTextNode.indexSelection < 0) {
                            // remove 1 letter at the beginning
                            this.selectedTextNode.text = this.selectedTextNode.text.substring(0, this.selectedTextNode.text.length - 1);
                            // update the selected cursor position
                            this.selectedTextNode.translateTo((this.cursor.position.x + w), this.cursor.position.y);
                        } else {
                            // add a letter at the end
                            this.selectedTextNode.text += code;
                            this.selectedTextNode.translateTo((this.cursor.position.x + w - this.computeTextWidth(this.selectedTextNode.text)), this.cursor.position.y);
                        }
                        this.selectedTextNode.indexSelection ++;
                        this.selectedTextNode._initShape();
                    } else {
                        this.selectedTextNode.reset();
                    }
                    this.cursor.translateWith(w, 0);
                    this.cursorLocation ++;
                } else if(!isSelected) {
                    this.selectedTextNode.reset();
                }
            }
        },

        /**
         * This function return the counter value.
         * @return {String} value
         */
        getCurrentValue : function() {
            return this.counter.value;
        },

        /**
         * This function return the width of the given letter.
         *
         * @param text the text from which we compute its width
         * @return {Number} the width of the letter.
         */
        computeTextWidth:function (text) {

            if (this.fakeCanvas != null) {
                //TODO : check if it more perfomance than recreate canvas ;)
                this.fakeCanvas.getContext('2d').clearRect(0, 0, 800, 1000);
            } else {
                this.fakeCanvas = document.createElement('canvas');
                this.fakeCanvas.width = 800;
                this.fakeCanvas.height = 1000;
                this.fakeContext = this._tmpCanvas.getContext('2d');
            }
            this.fakeContext.font = this.textNode._size + "pt " + this.textNode._typo;
            var metrics = this.fakeContext.measureText(text);

            return metrics.width;
        },

        /**
         * Pre-render the cloud into a temp canvas to optimize the perfs
         * @method initShape
         * @private
         */
        _initShape:function () {
            if(this._tmpCanvas != null) {
                //TODO : check if it more perfomance than recreate canvas ;)
                this._tmpCanvas.getContext('2d').clearRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
            } else {
                this._tmpCanvas = document.createElement('canvas');
                this._tmpCanvas.width = this.dimension.width;
                this._tmpCanvas.height = this.dimension.height;
                this.tmpContext = this._tmpCanvas.getContext('2d');
            }

            this.tmpContext.beginPath();
            this.tmpContext.strokeStyle = "#D4D4D4";
            this.tmpContext.font = this.font;
            this.tmpContext.rect(0, 0, this.dimension.width, this.dimension.height);
            this.tmpContext.stroke();
            this.tmpContext.closePath();

            // draw a "disabled" look & field
            if (this.disabled) {
                this.tmpContext.beginPath();
                this.tmpContext.fillStyle = "#F6F4F0";
                this.tmpContext.fillRect(1, 1, this.dimension.width - 2, this.dimension.height - 2);
                this.tmpContext.fill();
                this.tmpContext.closePath();
            }

            // show the placeholder or not
            this.placeholder.isVisible = this.displayPlaceHolder;
            //if () {
                /*this.tmpContext.beginPath();
                this.tmpContext.fillStyle = "#959595";
                this.tmpContext.font = 'italic ' + this.font;
                this.tmpContext.fillText(this.placeholder, 10, this.textNode.position.y);
                this.tmpContext.closePath();*/

            //}

        },

        /**
         * Custom rendering. Must be defined to allow the traverser to render this node
         * @method render
         * @protected
         * @override
         * @param {context}  context into render the node
         * */
        render:function (context) {
            //call this before your custom rendering
            this.beforeRender(context);

            //render the pre-rendered canvas
            context.drawImage(this._tmpCanvas, 0, 0);

            //call this after your custom rendering
            this.afterRender(context);
        },

        getChar : function(keyCode) {
            return String.fromCharCode(keyCode);
        },

        getKeyCode : function(event) {
            return (event.keyCode ? event.keyCode : event.which);
        },

        /**
         * Specify if the "SHIFT" key is pressed or not.
         * @param event
         * @return {Boolean} true, the key is pressed, otherwise false.
         */
        isShift : function(event) {
            return !!event.shiftKey;
        }
    }
);




/**
 * This node represent the look & feel of a selected text.
 * @type {*}
 */
var TextSelectionNode = CGSGNode.extend(
    {

        initialize : function(x, y, w, h) {
            //call the constructor of CGSGNode
            this._super(x, y, w, h);

            this.text = '';
            this.selectionColor = "#3399FF";
            this.textColor = "white";
            this.globalAlpha = 0.4;
            // if positive, selection is on the right, else on the left.
            this.indexSelection = 0;

            this.classType = "TextSelectionNode";
            this._tmpCanvas = null;

            this._initShape();
        },

        _initShape:function () {

            if (this._tmpCanvas != null) {
                //TODO : check if its more perfomance than recreate canvas ;)
                this._tmpCanvas.getContext('2d').clearRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
            } else {
                this._tmpCanvas = document.createElement('canvas');
                this._tmpCanvas.width = this.dimension.width;
                this._tmpCanvas.height = this.dimension.height;
                this.tmpContext = this._tmpCanvas.getContext('2d');
            }

            // selection color : 3399FF
            if (this.text.length > 0) {
                console.log('selection in progress..');
                this.tmpContext.beginPath();
                this.tmpContext.fillStyle = this.selectionColor;
                this.tmpContext.globalAlpha = this.globalAlpha;


                var w = this.computeTextWidth(this.text);
                this.tmpContext.fillRect(0, 0, w, this.dimension.height);
                //console.log(this.position.x + " / " + this.position.y + " / " + w + " / " + this.dimension.height);
                this.tmpContext.fill();
                this.tmpContext.closePath();
            }
        },

        getWidth : function() {
           return this.computeTextWidth(this.text);
        },

        reset : function() {
            this.text = '';
            this.indexSelection = 0;
            this._initShape();
        },

        // TODO : make utility function
        computeTextWidth:function (text) {

            if (this.fakeCanvas != null) {
                //TODO : check if it more perfomance than recreate canvas ;)
                this.fakeCanvas.getContext('2d').clearRect(0, 0, 800, 1000);
            } else {
                this.fakeCanvas = document.createElement('canvas');
                this.fakeCanvas.width = 800;
                this.fakeCanvas.height = 1000;
                this.fakeContext = this._tmpCanvas.getContext('2d');
            }
            this.fakeContext.font = "16pt arial";
            var metrics = this.fakeContext.measureText(text);

            return metrics.width;
        },

        //TODO : may be put the move function into the node !
        moveSelection : function(direction, letter) {

            /*if(direction === "left") {
                this.text = letter + this.text;
                this.translateTo((this.cursor.position.x - w), this.cursor.position.y);
                this.selectedTextNode._initShape();
            } else if(direction === "right") {

            } */

        },

        /**
         * Custom rendering. Must be defined to allow the traverser to render this node
         * @method render
         * @protected
         * @override
         * @param {context}  context into render the node
         * */
        render:function (context) {
            //call this before your custom rendering
            this.beforeRender(context);

            //render the pre-rendered canvas
            context.drawImage(this._tmpCanvas, 0, 0);

            //call this after your custom rendering
            this.afterRender(context);
        }

    }
);


var CursorNode = CGSGNode.extend(
    {

        initialize : function(x, y, w, h) {
            //call the constructor of CGSGNode
            this._super(x, y, w, h);

            this.cursorColor = "black";

            this.classType = "CursorNode";

            this.isVisible = false;

            // make the cursor animate !
            setInterval(
                //every 1000 ms make cursor visible !
                function(){
                    this.isVisible = true;
                    setTimeout(function() {
                        // at the end of 500 ms, toggle visible flag
                        this.isVisible = false;
                    }.bind(this), 500);

                }.bind(this), 1000);

            //fake canvas to pre-render static display
            this._tmpCanvas = null;
            this._initShape();
        },

        //TODO : may be put the move function into the node !

        /**
         * Pre-render the cloud into a temp canvas to optimize the perfs
         * @method initShape
         * @private
         */
        _initShape:function () {
            if(this._tmpCanvas != null) {
                this._tmpCanvas.getContext('2d').clearRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
            } else {
                this._tmpCanvas = document.createElement('canvas');
                this._tmpCanvas.width = this.dimension.width;
                this._tmpCanvas.height = this.dimension.height;
                this.tmpContext = this._tmpCanvas.getContext('2d');
            }
            // draw the cursor
            this.tmpContext.beginPath();
            this.tmpContext.strokeStyle = this.cursorColor;
            this.tmpContext.lineTo(0, 0);
            this.tmpContext.lineTo(0, this.dimension.height);
            this.tmpContext.stroke();
            this.tmpContext.closePath();
        },

        /**
         * Custom rendering. Must be defined to allow the traverser to render this node
         * @method render
         * @protected
         * @override
         * @param {context}  context into render the node
         * */
        render:function (context) {
            //call this before your custom rendering
            this.beforeRender(context);

            //render the pre-rendered canvas
            context.drawImage(this._tmpCanvas, 0, 0);

            //call this after your custom rendering
            this.afterRender(context);
        }

    }
);




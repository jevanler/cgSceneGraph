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

            this.font = "18px arial";

            /**
             * Define the class type.
             * Not mandatory but very useful, as Javascript does not have a mechanism to manage the type of class
             * @type {String}
             */
            this.classType = "InputTextNode";

            this.isDraggable = false;

            this.isLowerCase = false;

            this.displayCursor = false;

            this.placeholder = 'hit something';
            this.displayPlaceHolder = true;

            this.onClick = this.onClickHandler;

            this.traverser = new CGSGTraverser();

            // used by text selection.
            this.selectionStartPoint = 0;
            this.selectionEndPoint = 0;

            //window.document.addEventListener("keyup", this.keyupHandler.bind(this), false);
            window.document.addEventListener("keypress", this.keypressHandler.bind(this), false);
            window.document.addEventListener("keydown", this.keydownHandler.bind(this), false);

            // this is the entry text
            this.text = '';

            // represent the cursor
            this.cursor = new CursorNode(9, 4, 2, 50);

            //fake canvas to pre-render static display
            this._tmpCanvas = null;
            this._initShape();

        },

        onClickHandler : function(event) {

            // check if the click position is in the input text or out ! in order to give focus or not.
            console.log(event.position[0].x);
            console.log(event.position[0].y);

            // check if cursor is already add !!
            var cursor = this.traverser.traverse(this, function(node) { return node.classType == "CursorNode"; }, null);

            if (cursor.length == 0) {
                this.addChild(this.cursor);
            } else {
                // move cursor to the click position
                this.computeCursorLocation(event.position[0], cursor[0]);
            }

        },

        // TODO: maybe make this into the move cursor with a new type like 'position'
        computeCursorLocation : function(position, cursor) {
            var xrelatif = position.x - this.position.x;

            var index = 9;
            var i = 0;
            var w;

            do {
                w = this.computeTextWidth(this.text.charAt(i));
                index += w;
                i++;
            } while(index < xrelatif && i <= this.text.length);

            // correct the cursor because we exceed the limit !
            index -= w;
            // update cursor location
            this.cursorLocation = i-1;

            cursor.translateTo(index, cursor.position.y);

            console.log(xrelatif);
        },

        keypressHandler : function(e) {

            var keycode = this.getKeyCode(e);

            var letter = this.getChar(keycode);

            // key pressed is 'alphanumeric' or 'space'
            if ( (keycode >= 65 && keycode < 122) || keycode == 32 ) {

                letter = this.isLowerCase ? letter.toLowerCase() : letter;

                // if the cursor position is not at the end of the text (somewhere)
                if (this.cursorLocation+1 < this.text.length) {
                    // we have to add the letter between the others

                    var json = this.splitText(0, 0);

                    this.text = json.firstPart + letter + json.secondPart;

                } else {
                    this.text += letter;
                }

                this.moveCursor("right");

            }

            // display or not the placeHolder
            this.displayPlaceHolder = !!this.text.length == 0;

            this._initShape();
        },

        // intercept the backspace button in order to don't go back in the browser
        keydownHandler : function(e) {

            var keycode = this.getKeyCode(e);

            // key pressed is backspace
            if (keycode === 8) {
                e.preventDefault();
                var json = this.splitText(1, 0);
                this.moveCursor("left");
                this.text = json.firstPart + json.secondPart;
            }

            console.log(this.isShift(e));

            switch(keycode) {
                /* Arrow */
                case 37: // left
                    this.moveCursor("left");
                    if (this.isShift(e)) {
                        //make selection only if the cursor is not at the beginning !
                        console.log("make selection to the left !");
                        if (this.selectionStartPoint == 0) {
                            this.selectionStartPoint = this.cursor.position.x;
                        }
                        this.selectionEndPoint = this.cursor.position.x;
                    } else {
                        this.selectionStartPoint = 0;
                    }
                    return false;
                case 39: // right
                    this.moveCursor("right");
                    if (this.isShift(e)) {
                        //make selection only if the cursor is not at the end !
                        console.log("make selection to the right !");
                    } else {
                        this.selectionStartPoint = 0;
                    }
                    return false;

                case 46: // del
                    if (this.cursorLocation < this.text.length) {
                        console.log("deletion !");
                        json = this.splitText(0, 1);
                        this.text = json.firstPart + json.secondPart;
                        this._initShape();
                    }
                    return false;

            }

            this._initShape();
        },

        /**
         * This function split the text in two part and can remove some letter in the given direction.
         * @param leftStep
         * @param rightStep
         * @return {Object}
         */
        splitText : function(leftStep, rightStep) {

            var firstpart = this.text.substr(0, this.cursorLocation - leftStep);

            var secondpart = this.text.substr(this.cursorLocation + rightStep);

            return {firstPart : firstpart, secondPart : secondpart};
        },

        moveCursor : function(actionType) {
            // we get the size of the given letter
            console.log("text : " + this.text + " type : " + actionType);
            var code = '';
            var w = 0;

            var textLength = this.text.length;

            if (actionType === "left") {

                // check if it is possible to move cursor to the left. (cursor is not at the beginning of the text)
                if (this.cursorLocation > 0) {
                    this.cursorLocation --;
                    code = this.text.charAt(this.cursorLocation);
                    w = this.computeTextWidth(code);
                    console.log("move to left : " + code);
                    this.cursor.translateWith(-w, 0);
                }

            } else if (actionType === "right") {

                // check if it is possible to move cursor to the right. (cursor is not at the end of the text)
                if (this.cursorLocation < textLength) {
                    code = this.text.charAt(this.cursorLocation);
                    w = this.computeTextWidth(code);
                    console.log("move to right : " + code);
                    this.cursor.translateWith(w, 0);
                    this.cursorLocation ++;
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
         * @param letter the letter from which we compute its width
         * @return {Number} the width of the letter.
         */
        computeTextWidth:function (letter) {

            if (this.fakeCanvas != null) {
                //TODO : check if it more perfomance than recreate canvas ;)
                this.fakeCanvas.getContext('2d').clearRect(0, 0, 800, 1000);
            } else {
                this.fakeCanvas = document.createElement('canvas');
                this.fakeCanvas.width = 800;
                this.fakeCanvas.height = 1000;
                this.fakeContext = this._tmpCanvas.getContext('2d');
            }

            this.fakeContext.font = this.font;
            var metrics = this.fakeContext.measureText(letter);

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

            var padding = 0;

            this.tmpContext.beginPath();
            this.tmpContext.fillStyle = "black";
            this.tmpContext.font = this.font;
            this.tmpContext.rect(0, 0, 300, 40);
            this.tmpContext.stroke();
            this.tmpContext.fillText(this.text, 10 + padding, 27);
            this.tmpContext.closePath();

            // draw the placeholder
            if (this.displayPlaceHolder) {
                this.tmpContext.beginPath();
                this.tmpContext.fillStyle = "#959595";
                this.tmpContext.font = 'italic 20px arial';
                this.tmpContext.fillText(this.placeholder, 10 + padding, 27);
                this.tmpContext.closePath();
            }


            // selection color : 3399FF

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

        isShift : function(event) {
            var key;
            var isShift;
            /*if (event) {
                key = event.keyCode;
                isShift = !!event.shiftKey;
            } else {
                key = event.which;
                isShift = !!event.shiftKey;
            }*/

            return !!event.shiftKey;
        }
    }
);


var CursorNode = CGSGNode.extend(
    {

        initialize : function(x, y, w, h) {
            //call the constructor of CGSGNode
            this._super(x, y, w, h);

            this.cursorH = 25;
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
            this.tmpContext.strokeStyle = this.cursorColor;
            this.tmpContext.lineTo(0, 5);
            this.tmpContext.lineTo(0, 5 + this.cursorH);
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





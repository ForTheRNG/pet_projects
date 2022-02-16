/**
 * Computation function antet, both quantum and non-quantum
 * @callback Computation
 * @param {ExpNode[]} nodes Child nodes, used for computation
 * @param {*} [aux] Any other information required by the operand
 * @returns {Value | Number | boolean} Result of computation
 */

class Value {
    num = [];
    bool = [];
    numch = 0;
    boolch = 0;

    /**
    * Value constructor. Value is collapsed at the end.
    * @param {Number | 
    *         {val: Number | Boolean | Value, ch: Number}[] |
    *         Number |
    *         Boolean |
    *         Value} val Number of dice to roll.
    * @param {Number} [size] Size of dice to roll.
    * 
    * OR
    * @param val Array of possibilities for this value.
    * @param val[].val Value possibility, as number, boolean or Value structure (which will be flattened).
    * @param val[].ch Chance for value to appear, as number in [0, 1].
    * 
    * OR
    * @param val Single number or boolean value for this value. Chance will be set to 1.
    * 
    * OR
    * @param val Value to be copied.
    */
    constructor(val, size) {
        if (typeof val == "number") {
            if (typeof size == "undefined") {
                this.num = [{val: val, ch: 1}];
                this.numch = 1;
            } else if (val > 0 && size > 0) {
                let stdarr = [];
                for (let i = 1; i <= size; i++) {
                    stdarr.push({val: i, ch: 1 / size});
                }
                let die = new Value(stdarr);
                while (val > 1) {
                    die = die.oper(die, "+");
                    val--;
                }
                this.num = die.num;
                this.numch = die.numch;
                this.bool = die.bool;
                this.boolch = die.boolch;
            }
        } else if (typeof val == "boolean") {
            this.bool = [{val: val, ch: 1}];
            this.boolch = 1;
        } else if (Array.isArray(val)) {
            for (let x of val) {
                if (x.val.constructor.name == "Value") {
                    for (let y of x.val.num) {
                        let elem = {val: y.val, ch: y.ch * x.ch};
                        this.num.push(elem);
                    }
                    this.numch += x.val.numch * x.ch;
                    for (let y of x.val.bool) {
                        let elem = {val: y.val, ch: y.ch * x.ch};
                        this.num.push(elem);
                    }
                    this.boolch += x.val.boolch * x.ch;
                }
                if (typeof x.val == "number") {
                    this.num.push(x);
                    this.numch += x.ch;
                }
                if (typeof x.val == "boolean") {
                    this.bool.push(x);
                    this.boolch += x.ch;
                }
            }
            this.collapse();
        } else if (val.constructor.name == "Value") {
            for (let y of val.num) {
                let elem = {val: y.val, ch: y.ch};
                this.num.push(elem);
            }
            this.numch = val.numch;
            for (let y of val.bool) {
                let elem = {val: y.val, ch: y.ch};
                this.num.push(elem);
            }
            this.boolch = val.boolch;
        }
    };

    /**
     * Collapses similar entries into one singular entry, with chances summed.
     * Also reduces chance sum to 1.
     */
    collapse() {
        this.num.sort((a, b) => a.val - b.val);
        for (let i = 1; i < this.num.length; i++) {
            if (this.num[i - 1].val == this.num[i].val) {
                this.num[i - 1].ch += this.num[i].ch;
                this.num.splice(i, 1);
                i--;
            }
        }
        let newval = [{val: true, ch: 0}, {val: false, ch: 0}];
        for (let x in this.bool) {
            if (x.ch) {
                newval[0].ch += x.ch;
            } else {
                newval[1].ch += x.ch;
            }
        }
        this.bool = newval;
        let aux = this.numch + this.boolch;
        for (let arr of [this.num, this.bool]) {
            for (let pos of arr) {
                pos.ch = pos.ch / aux;
            }
        }
        this.numch = this.numch / aux;
        this.boolch = this.boolch / aux;
    }

    /**
     * Choosing of one value using Math.random() from all specified possibilities.
     * @param {string} type Type of return; "num" for number, "bool" for boolean,
     * anything else for either one chosen at random.
     * @returns {number | boolean} Value chosen.
     */
    choose(type) {
        let val;
        if (type == "num") {
            val = this.num;
        } else if (type == "bool") {
            val = this.bool;
        } else {
            let tip = Math.random();
            val = tip >= this.numch ? this.bool : this.num;
        }
        let total = 0, prag = Math.random();
        let rez;
        for (let i = 0; i < val.length; i++) {
            total += val[i].ch;
            if (total > prag) {
                rez = val[i].val;
                break;
            }
        }
        return rez;
    }

    /**
     * Inverts the value, changing number values to their opposites and negating true
     * and false.
     */
    oppose() {
        for (let x of this.num) {
            x.val = -x.val;
        }
        this.num.reverse();
        let aux = this.bool[0].ch;
        this.bool[0].ch = this.bool[1].ch;
        this.bool[1].ch = aux;
    }

    /**
     * Performs the specified operations on two values, with the result collapsed at the end.
     * @param {Value} val Value to do operations with.
     * @param {string} type Operation type. Types of operations:
     * "+" -> Sum and OR; "*" -> Multiplication and AND; "/" -> C-style division and XOR.
     * @returns New value, the result of the given operation.
     */
    oper(val, type) {
        if (type != "+" && type != "*" && type != "/") {
            throw {
                msg: "Operation type undefined!",
                oper: type
            };
        }
        let rezarr = [];
        for (let x of this.num) {
            for (let y of val.num) {
                let elem = {ch: x.ch * y.ch};
                if (type == "+") {
                    elem.val = x.val + y.val;
                } else if (type == "*") {
                    elem.val = x.val * y.val;
                } else if (type == "/") {
                    elem.val = Math.floor(x.val / y.val);
                }
                rezarr.push(elem);
            }
        }
        for (let x of this.bool) {
            for (let y of val.bool) {
                let elem = {ch: x.ch * y.ch};
                if (type == "+") {
                    elem.val = x.val || y.val;
                } else if (type == "*") {
                    elem.val = x.val && y.val;
                } else if (type == "/") {
                    elem.val = (x.val || y.val) && !(x.val && y.val);
                }
                rezarr.push(elem);
            }
        }
        let rez = new Value(rezarr);
        rez.collapse();
        return rez;
    }
}

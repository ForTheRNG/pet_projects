/**
 * Computation function antet, both quantum and non-quantum
 * @callback Computation
 * @param {ExpNode[]} nodes Child nodes, used for computation
 * @param {*} [aux] Any other information required by the operand
 * @returns {Value | Number | boolean} Result of computation
 */


const tokenreg = /\s*([TtFf])[a-zA-Z]*\s*|\s*(\d+)\s*|\s*([$+\-*/\(\)dD?:><!&|])\s*/g;

const opers = [
    {
        sign: "$",
        prec: 14,
        num: 1,
        compute: (nodes, vars) => {
            let x = nodes[0].compute();
            if (x >= vars.length || x < 0) {
                return NaN;
            }
            return vars[x];
        },
        analyze: (nodes, vars) => {
            let rezarr = [];
            for (x of nodes[0].analyze().num) {
                rezarr.push({val: x.val >= vars.length ? NaN : (x.val < 0 ? NaN : vars[x.val]), ch: x.ch});
            }
            return new Value(rezarr);
        }
    },{
        sign: "d",
        prec: 13,
        num: 2,
        compute: (nodes) => {
            let a = nodes[0].compute(), b = nodes[1].compute();
            let rez = 0;
            for (let i = 0; i < a; i++) {
                let rand = Math.random();
                if (!rand) {
                    rand = 1;
                }
                rez += Math.ceil(rand * b);
            }
            return rez;
        },
        analyze: (nodes) => {
            let rezarr = [], a = nodes[0].analyze(), b = nodes[1].analyze();
            for (let x of a.num) {
                for (let y of b.num) {
                    rezarr.push({val: new Value(x.val, y.val), ch: x.ch * y.ch});
                }
            }
            return new Value(rezarr);
        }
    },{
        sign: "/",
        prec: 11,
        num: 2,
        compute: (nodes) => Math.floor(nodes[0].compute() / nodes[1].compute()),
        analyze: (nodes) => nodes[0].analyze().oper(nodes[1].analyze(), "/")
    },{
        sign: "*",
        prec: 11,
        num: 2,
        compute: (nodes) => nodes[0].compute() * nodes[1].compute(),
        analyze: (nodes) => nodes[0].analyze().oper(nodes[1].analyze(), "*")
    },{
        sign: "-",
        prec: 12,
        num: 1,
        compute: (nodes) => -nodes[0].compute(),
        analyze: (nodes) => nodes[0].analyze().oppose()
    },{
        sign: "+",
        prec: 10,
        num: 2,
        compute: (nodes) => nodes[0].compute() + nodes[1].compute(),
        analyze: (nodes) => nodes[0].analyze().oper(nodes[1].analyze(), "+")
    },{
        sign: ":",
        prec: 1,
        num: 3,
        compute: (nodes) => nodes[0].compute() ? nodes[1].compute() : nodes[2].compute(),
        analyze: (nodes) => {
            let tf = nodes[0].analyze();
            return new Value([{val: nodes[1].analyze(), ch: tf[0].val},
                {val: nodes[1].analyze(), ch: tf[1].val}]);
        }
    },{
        sign: ">",
        prec: 9,
        num: 2, 
        compute: (nodes) => nodes[0].compute() > nodes[1].compute(),
        analyze: (nodes) => {
            let a = nodes[0].analyze(), b = nodes[1].analyze(), rezarr = [];
            for (let x of a.num) {
                for (let y of b.num) {
                    rezarr.push({val: x.val > y.val, ch: x.ch * y.ch});
                }
            }
            return new Value(rezarr);
        }
    },{
        sign: "<",
        prec: 9,
        num: 2, 
        compute: (nodes) => nodes[0].compute() < nodes[1].compute(),
        analyze: (nodes) => {
            let a = nodes[0].analyze(), b = nodes[1].analyze(), rezarr = [];
            for (let x of a.num) {
                for (let y of b.num) {
                    rezarr.push({val: x.val < y.val, ch: x.ch * y.ch});
                }
            }
            return new Value(rezarr);
        }
    },{
        sign: "!",
        prec: 8,
        num: 1,
        compute: (nodes) => !nodes[0].compute(),
        analyze: (nodes) => nodes[0].analyze().oppose()
    },{
        sign: "&",
        prec: 7,
        num: 2,
        compute: (nodes) => nodes[0].compute() && nodes[1].compute(),
        analyze: (nodes) => nodes[0].analyze().oper(nodes[1].analyze(), "*")
    },{
        sign: "^",
        prec: 6,
        num: 2,
        compute: (nodes) => !(nodes[0].compute() && nodes[1].compute()) && (nodes[0].compute() || nodes[1].compute()),
        analyze: (nodes) => nodes[0].analyze().oper(nodes[1].analyze(), "/")
    },{
        sign: "|",
        prec: 7,
        num: 2,
        compute: (nodes) => nodes[0].compute() && nodes[1].compute(),
        analyze: (nodes) => nodes[0].analyze().oper(nodes[1].analyze(), "+")
    }
];

class ExpNode {
    nodes = [];
    /**
     * Node constructor.
     * @param {{compute: Computation, analyze: Computation} | Value} val Node information.
     * @param {Computation} val.compute - Function to be called when computing "non-quantum"
     * expression.
     * @param {Computation} val.analyze Function to be called when computing "quantum" expression.
     * @param {ExpNode[]} [nodes] List of child nodes.
     * @param {Value[]} [vars] List of overexpression variables.
     * 
     * OR
     * @param val Value of leaf node.
     */
    constructor(val, nodes, vars) {
        if (typeof nodes == "undefined") {
            this.val = val;
            this.compute = () => this.val;
            this.analyze = () => new Value(this.val);
        } else {
            this.val = val;
            this.vars = vars;
            this.nodes = nodes;
            this.compute = () => this.val.compute(this.nodes, this.vars);
            this.analyze = () => this.val.analyze(this.nodes, this.vars);
        }
    }
}

class Expression {
    /**
     * Constructs expression tree from a naturally-expressed string.
     * @param {String} str Said string.
     * @param {Value[]} vars Overexpression variables.
     */
    constructor(str, vars) {
        let tokens = [...(str.matchAll(tokenreg))].map((x) => {
            let r = x[1] || x[2] || x[3];
            if (/[A-Z]/.test(r)) r.toLowerCase();
            return r;
        });
        for (let i = 1; i < tokens.length - 1; i++) {
            if (tokens[i] == "-" && /\d+/.test(tokens[i - 1])) {
                tokens.splice(i, 0, "+");
            }
        }
        let crnodes = [];
        let opstack = [];
        for (let i = 0; i < tokens.length; i++) {
            if (/\d+/.test(tokens[i])) {
                crnodes.push(new ExpNode(parseInt(tokens[i])));
            } else if (tokens[i] == "t" || tokens[i] == "f") {
                crnodes.push(new ExpNode(tokens[i] == "t"));
            } else if (tokens[i] == "(") {
                opstack.push(tokens[i]);
            } else if (tokens[i] == ")") {
                let oper = opstack.pop();
                while (oper != "(") {
                    let newnode = new ExpNode(oper, crnodes.splice(-oper.num, oper.num), vars);
                    crnodes.push(newnode);
                    oper = opstack.pop();
                }
            } else {
                let oper = opers.find(x => x.sign == tokens[i]);
                if (typeof oper == "undefined") {
                    oper = opers.find(x => x.sign == ":");
                }
                let top = opstack.pop();
                while (typeof top != 'undefined' && top != "(" && top != "?" && top.prec >= oper.prec) {
                    let newnode = new ExpNode(top, crnodes.splice(-top.num, top.num), vars);
                    crnodes.push(newnode);
                    top = opstack.pop();
                }
                if (typeof top != "undefined" && !(top == "?" && tokens[i] == ":")) {
                    opstack.push(top);
                }
                if (tokens[i] == "?") {
                    opstack.push("?");
                } else {
                    opstack.push(oper);
                }
            }
        }
        while (opstack.length > 0) {
            let top = opstack.pop();
            let newnode = new ExpNode(top, crnodes.splice(-top.num, top.num), vars);
            crnodes.push(newnode);
        }
        this.topnode = crnodes[0];
    }
    compute = () => this.topnode.compute();
    analyze = () => this.topnode.analyze();
}

class OverExpression {
    /**
     * Transforms string into list of expressions.
     * @param {string} str List of variable expressions and actual expression.
     */
    constructor(str) {
        let strs = str.split("=");
        this.vars = [];
        this.exps = [];
        for (let substr of strs) {
            this.exps.push(new Expression(substr, this.vars));
        }
    }
    compute() {
        for (let exp of this.exps) {
            this.vars.push(exp.compute());
        }
        let rez = this.vars.pop();
        this.vars.splice(0, this.vars.length);
        return rez;
    }
    analyze() {
        for (let exp of this.exps) {
            this.vars.push(exp.analyze());
        }
        let rez = this.vars.pop();
        this.vars.splice(0, this.vars.length);
        return rez;
    }
}

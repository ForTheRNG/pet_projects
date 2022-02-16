let expr = new OverExpression("1d6+2+1d10= 3d4/2*3-2= $0>$1?$0:$1");
console.log(expr.compute());
console.log(expr.analyze());
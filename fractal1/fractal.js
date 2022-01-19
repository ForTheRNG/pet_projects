var r3=Math.sqrt(3);
var hexa=[{x:-1,y:0},{x:-1/2,y:r3/2},{x:1/2,y:r3/2},{x:1,y:0},{x:1/2,y:-r3/2},{x:-1/2,y:-r3/2}];
var patrat=[{x:-1,y:-1},{x:-1,y:1},{x:1,y:1},{x:1,y:-1}];
var triunghi=[{x:1,y:0},{x:-r3/2,y:-1/2},{x:-r3/2,y:1/2}]; // DOES NOT WORK

class Queue{
    constructor(){
        this.queue=[];
        this.offset=0;
    }
    getLength(){ return this.queue.length - this.offset; }
    isEmpty(){ return (this.queue.length == 0); }
    push(item){ this.queue.push(item); }
    del(){
        if (this.queue.length == 0) 
            return undefined;
        var item = this.queue[this.offset];
        if (++ this.offset * 2 >= this.queue.length){
            this.queue  = this.queue.slice(this.offset);
            this.offset = 0;
        }
        return item;
    }
    front(){ return (this.queue.length > 0 ? this.queue[this.offset] : undefined); }
  }

class poly{
    constructor(par){
        this.x=par.x;
        this.y=par.y;
        this.dir=par.dir;
        this.ori=par.ori;
        this.id=par.id;
        this.alfa=par.alfa;
    }
    repr(par){
        var c=par.ctx,f=par.fac;
        c.fillStyle=par.cul;
        c.strokeStyle=par.cul;
        c.beginPath();
        c.moveTo((this.x+this.dir[this.dir.length-1].x)*f,(this.y+this.dir[this.dir.length-1].y)*f);
        for(let d of this.dir)
            c.lineTo((this.x+d.x)*f,(this.y+d.y)*f)
        c.closePath();
        c.fill();
        c.stroke();
    }
    vecin(nr){ return new poly({x:this.x+this.dir[nr].x+this.dir[(nr+1)%this.dir.length].x,
        y:this.y+this.dir[nr].y+this.dir[(nr+1)%this.dir.length].y,dir:this.dir,ori:nr+Math.floor(this.dir.length/2+0.5),id:this.id+1}); }
}

class retea{
    constructor(par){
        this.dir=par;
        this.n=this.dir.length;
        this.mar=new Queue();
        this.tot=[];
        var init=new poly({x:0,y:0,dir:this.dir,ori:0,id:0,alfa:0});
        this.mar.push(init);
        this.tot.push(init);
        this.max=1;
    }
    pas(){
        let or=this.mar.front();
        let nmax=0;
        let rez={sw:false,dede:[]};
        for(let a=0;a<this.n;a+=Math.floor(this.n/3)){
            let val=0;
            let x=or.vecin((a+or.ori)%this.n);
            for(let d=0;d<this.n;d++){
                let p=x.vecin(d);
                let ind=this.tot.findIndex(a=>{if(Math.abs(a.x-p.x)<0.1 && Math.abs(a.y-p.y)<0.1) return true; else return false;});
                if(ind>=0)
                    val++;
            }
            if(val<2){
                for(let d=0;d<this.n;d++){
                    let p=x.vecin(d);
                    if(p.x>nmax)
                        nmax=p.x;
                    if(p.y>nmax)
                        nmax=p.y;
                }
                if(this.max<nmax){
                    this.max=nmax;
                    rez.sw=true;
                }
                this.mar.push(x);
                this.tot.push(x);
                rez.dede.push(x);
            }
        }
        this.mar.del();
        return rez;
    }
}

class desen{
	constructor(ret,part,freq){
		this.ret=ret;
        this.part=part;
        this.freq=freq;
		this.cvs=[];
		for(let i=0;i<2;i++){
			let cucu=document.createElement("div");
			cucu.innerHTML='<canvas style="position:absolute; left:0px; top:0px; z-index:'+i+';">';
			this.cvs[i]=cucu.firstChild;
			part.appendChild(this.cvs[i]);
			this.cvs[i].width=window.innerWidth*19/20;
			this.cvs[i].height=window.innerHeight*19/20;
		}
		this.width=this.cvs[0].width;
		this.height=this.cvs[0].height;
		this.top=0;
	}
	reprez(par){
        let fac=(this.width>this.height?this.height:this.width)/this.ret.max/2;
        if(par.sw){
            this.top=1-this.top;
            this.cvs[this.top].width=window.innerWidth*19/20;
            this.cvs[this.top].height=window.innerHeight*19/20;
            this.width=this.cvs[this.top].width;
            this.height=this.cvs[this.top].height;
            var con=this.cvs[this.top].getContext("2d");
            con.clearRect(0,0,this.width,this.height);
            con.translate(this.width/2,this.height/2);
            for(let obj of this.ret.tot){
                var cul=((obj.id*192/this.freq)%192)*(256*256+256+1);
                obj.repr({ctx:con,fac:fac,cul:'#'+cul.toString(16)});
            }
            this.cvs[1-this.top].style.display='none';
            this.cvs[this.top].style.display='initial';
            con.translate(-this.width/2,-this.height/2);
        }
        else{
            var con=this.cvs[this.top].getContext("2d");
            con.translate(this.width/2,this.height/2);
            for(let obj of par.dede){
                var cul=((obj.id*192/this.freq)%192)*(256*256+256+1);
                obj.repr({ctx:con,fac:fac,cul:'#'+cul.toString(16)});
            }
            con.translate(-this.width/2,-this.height/2);
        }
		return;
	}
};

var dd=new desen(new retea(hexa),document.getElementById('div'),322);

function ticc(){
    dd.reprez(dd.ret.pas());
    return;
}

setInterval(ticc,1);
class vec{
	constructor(ch){
		if(!('dim' in ch)) this.dim=0; else this.dim=ch.dim;
		this.c=[];
		if(!('c' in ch))
			for(let i=0;i<this.dim;i++)
				this.c[i]=0;
		else{
			if(this.dim!=ch.c.length)
				this.dim=ch.c.length;
			for(let i=0;i<this.dim;i++)
				this.c[i]=ch.c[i];
		}
	}
	mod(){
		var rez=0;
		for(let i=0;i<this.dim;i++)
			rez+=this.c[i]*this.c[i];
		return Math.sqrt(rez);
	}
	add(a){
		if(!a.dim || a.dim!=this.dim){
			console.log('vezi ca adunarea de vectori nu merge');
			return {dim:0};
		}
		var arr=[];
		for(let i=0;i<this.dim;i++) arr[i]=0;
		var rez=new vec({dim:this.dim,c:arr});
		for(let i=0;i<this.dim;i++)
			rez.c[i]=this.c[i]+a.c[i];
		return rez;
	}
	mult(a){
		if(typeof a !='number'){
			console.log('vezi ca inmultirea nu merge');
			return {dim:0};
		}
		var arr=[];
		for(let i=0;i<this.dim;i++) arr[i]=0;
		var rez=new vec({dim:this.dim,c:arr});
		for(let i=0;i<this.dim;i++)
			rez.c[i]=this.c[i]*a;
		return rez;
	}
	sub(a){ return this.add(a.mult(-1)); }
};


class obj{
	constructor(ch){
		let amp;
		if(!('id' in ch)) this.id=-1; else this.id=ch.id;
		if(!('m' in ch)) this.m=0; else this.m=ch.m;
		if(!('rad' in ch)) this.rad=0; else this.rad=ch.rad;
		if(!('el' in ch)) this.el=0; else this.el=ch.el;
		if(!('dim' in ch)) this.dim=0; else this.dim=ch.dim;
		if(!('type' in ch)) this.type=0; else this.type=ch.type;
		this.miu=0; // Frecarea are telefonul inchis sau nu este in aria de acoperire a retelei. Va rugam reveniti.
		if(!ch.r)
			this.r=new vec({dim:this.dim});
		else{
			if(ch.r.c.length!=this.dim)
				this.dim=ch.r.c.length;
			this.r=new vec(ch.r);
		}
		if(!ch.v)
			this.v=new vec({dim:this.dim});
		else{
			if(ch.v.c.length!=this.dim)
				this.dim=ch.v.c.length;
			this.v=new vec(ch.v);
		}
		this.a=new vec({dim:this.dim});
	}
	inter(x,grav){
		var d=this.r.sub(x.r).mod();
		var rez=this.r.mult(-grav*x.m*this.m/(d*d*d));
		return rez;
	}
	coliz(x){
		var dir=this.r.sub(x.r);
		if(dir.mod()<=this.rad+x.rad){
			var k=Math.sqrt(this.el*x.el);
			dir=dir.mult(1/dir.mod());
			var aux=[];
			aux[0]={th:dir.mult(-this.v.mod()),x:dir.mult(x.v.mod())}; //parte din triunghiul necesar pentru cosinus
			aux[1]={th:aux[0].th.sub(this.v).mod()/this.v.mod(),x:aux[0].x.sub(x.v).mod()/x.v.mod()}; //raportul intre a treia latura a triunghiului si prima
			aux[2]={th:1-0.5*aux[1].th*aux[1].th,x:1-0.5*aux[1].x*aux[1].x}; //cosinusul
			aux[3]={th:aux[0].th.mult(aux[2].th),x:aux[0].x.mult(aux[2].x)}; //vitezele pe axa de coliziune
			var vpr=aux[3].th.mult(this.m).add(aux[3].x.mult(x.m)).mult(1/(this.m+x.m)) //v' de la ciocnirea plastica
			aux[4]={th:vpr.add(vpr.sub(aux[3].th).mult(k)),x:vpr.add(vpr.sub(aux[3].x).mult(k))}; //vitezele pe axe dupa ciocnire
			this.v=this.v.sub(aux[3].th).add(aux[4].th); //viteza finala
			x.v=x.v.sub(aux[3].x).add(aux[4].x); //viteza finala
			return true;
		}
		else return false;
	}
	merge(x){
		this.m+=x.m;
		this.rad=Math.pow((Math.pow(this.r,this.dim)+Math.pow(x.r,this.dim)),1/this.dim);
		x.id=-1;
		x.m=0;
		x.rad=0;
		return;
	}
};

class spatiu{
	constructor(ch){
		if(!ch.dim) this.dim=0; else this.dim=ch.dim; //numar de dimensiuni
		if(!('nob' in ch)) this.nob=0; else this.nob=ch.nob;
		var arr=[];
		for(let i=0;i<this.nob;i++) arr[i]=new obj({id:i,dim:this.dim});
		this.lis=[];
		if(!ch.lis) this.lis=arr; 
		else
			//lista de obiecte propriu-zisa
			for(let i=0;i<ch.lis.length;i++)
				this.lis[i]=new obj(ch.lis[i]);
		for(let ob of this.lis)
			for(let x of this.lis)
				if(ob.id!=x.id && ob.r.sub(x.r).mod()<ob.rad)
					ob.merge(x);
		this.nob=this.lis.length;
		for(let ob of this.lis)
			if(ob.id<0 || ob.m==0)
				this.lis.splice(this.lis.indexOf(ob),1);
		if(!ch.grav) this.grav=0; else this.grav=ch.grav; //const gravitationala
		if(!ch.timefac) this.timefac=1; else this.timefac=ch.timefac; //precizia
		this.max=new vec({dim:this.dim});
		for(let x of this.lis)
			for(let i=0;i<this.dim;i++)
				if(Math.abs(x.r.c[i])+x.rad>this.max.c[i])
					this.max.c[i]=Math.abs(x.r.c[i])+x.rad; //maximul in orice directie
		this.ham=0; //hamiltonianul sistemului == totalul de energie
		for(let ob of this.lis){
			this.ham+=ob.m*ob.v.mod()*ob.v.mod()/2;
			for(let x of this.lis){
				if(ob.id==x.id) continue;
				else this.ham-=this.grav*ob.m*x.m*ob.r.sub(x.r).mod()/2;
			}
		}
	}
	forta(x){
		var f=new vec({dim:this.dim});
		f=f.mult(0);
		for(let ob of this.lis){
			if(ob.id==x.id) continue;
			else f=f.add(x.inter(ob,this.grav));
		}
		x.a=f.mult(1/x.m);
	}
	centrare(){
		var cen=new obj({m:0,el:0,rad:0,dim:this.dim,col:false});
		cen.r=cen.r.mult(0);
		cen.v=cen.v.mult(0);
		cen.a=cen.a.mult(0);
		for(let x of this.lis){
			cen.r=cen.r.add(x.r);
			cen.v=cen.v.add(x.v.mult(x.m));
			cen.m=cen.m+x.m;
		}
		cen.r=cen.r.mult(1/this.lis.length);
		cen.v=cen.v.mult(1/cen.m);
		for(let x of this.lis){
			x.r=x.r.sub(cen.r);
		}
		this.max=this.max.sub(cen.r);
	}
	timp(t){
		var nmax=[];
		for(let j=0;j<this.dim;j++) nmax[j]=0;
		for(let ob of this.lis){
			ob.r=ob.r.add(ob.v.mult(t/1000/this.timefac));
			ob.v=ob.v.add(ob.a.mult(t/1000/this.timefac));
			for(let x of this.lis)
				if(x.id>ob.id)
					ob.coliz(x);
			this.forta(ob);
			for(let j=0;j<this.dim;j++)
				if(Math.abs(ob.r.c[j])+ob.rad>nmax[j])
					nmax[j]=Math.abs(ob.r.c[j])+ob.rad;
		}
		this.max.c=nmax;
		this.centrare();
		this.ham=0;
		for(let ob of this.lis){
			this.ham+=ob.m*ob.v.mod()*ob.v.mod()/2;
			for(let x of this.lis){
				if(ob.id==x.id) continue;
				else this.ham-=this.grav*ob.m*x.m*ob.r.sub(x.r).mod()/2;
			}
		}
		return;
	}
};

class desen{
	constructor(sp,part){
		this.sp=new spatiu(sp);
		this.part=part;
		this.sp.centrare();
		this.cvs=[];
		for(let i=0;i<2;i++){
			let cucu=document.createElement("div");
			cucu.innerHTML='<canvas style="z-index:'+i+';" class="cvsstyle">';
			this.cvs[i]=cucu.firstChild;
			part.appendChild(this.cvs[i]);
		}
		this.width=this.cvs[0].width;
		this.height=this.cvs[0].height;
		this.top=0;
	}
	reprez(){
		this.top=1-this.top;
		this.cvs[this.top].width=this.part.clientWidth;
		this.cvs[this.top].height=this.part.clientHeight;
		this.width=this.cvs[this.top].width;
		this.height=this.cvs[this.top].height;
		var con=this.cvs[this.top].getContext("2d");
		con.clearRect(0,0,this.width,this.height);
		con.translate(this.width/2,this.height/2);
		let fac=(this.width>this.height?this.height:this.width)/this.sp.max.mod()/2;
		for(let obj of this.sp.lis){
			con.beginPath();
			con.strokeStyle='#bada55';
			con.fillStyle='#bada55';
			if(this.sp.dim==1)
				con.rect(obj.r.c[0]*fac-obj.rad*fac/2,-this.height/2,obj.rad*fac,this.height);
			else
				con.arc(obj.r.c[0]*fac,obj.r.c[1]*fac,obj.rad*fac,0,2*Math.PI);
			con.fill();
			con.stroke();
		}
		this.cvs[this.top].style.display='initial';
		this.cvs[1-this.top].style.display='none';
		con.translate(-this.width/2,-this.height/2);
		return;
	}
};

var amspatiu=undefined;
var parsp={dim:0,grav:0,timefac:1,lis:[]};

function setgenparam(){
	parsp.lis=0;
	parsp.dim=parseInt(document.getElementById('dim').value);
	parsp.grav=parseInt(document.getElementById('grav').value);
	parsp.timefac=parseInt(document.getElementById('timefac').value);
	parsp.lis=[];
}

function setrandparam(){
	let l=parsp.lis.length, nob=parseInt(document.getElementById('nobrg').value);
	let dim=parsp.dim;
	let par={r:[],v:[]};
	for(let i=0;i<dim;i++){
		par.r.push(parseFloat(document.getElementById('rrg').value));
		par.v.push(parseFloat(document.getElementById('vrg').value));
	}
	par.el=parseFloat(document.getElementById('elrg').value);
	par.m=parseFloat(document.getElementById('mrg').value);
	par.rad=parseFloat(document.getElementById('radrg').value);
	for(let i=0;i<nob;i++){
		let ob={r:{},v:{}};
		ob.dim=dim;
		ob.id=l;
		l++;
		ob.el=par.el;
		ob.m=Math.random()*par.m;
		ob.rad=Math.random()*par.rad;
		ob.r.dim=dim; ob.r.c=[];
		ob.v.dim=dim; ob.v.c=[];
		for(let j=0;j<dim;j++){
			ob.r.c.push((2*Math.random()-1)*par.r[j]);
			ob.v.c.push((2*Math.random()-1)*par.v[j]);
		}
		parsp.lis.push(new obj(ob));
	}
}

function pushobj(){
	let ob={r:{},v:{}};
	ob.id=parsp.lis.length;
	ob.dim=parsp.dim;
	ob.r.dim=parsp.dim; ob.r.c=[];
	ob.v.dim=parsp.dim; ob.v.c=[];
	ob.el=parseFloat(document.getElementById('el').value);
	ob.rad=parseFloat(document.getElementById('rad').value);
	ob.m=parseFloat(document.getElementById('m').value);
	for(let i=0;i<ob.dim;i++){
		ob.r.c.push(parseFloat(document.getElementById('r').value));
		ob.v.c.push(parseFloat(document.getElementById('v').value));
	}
	parsp.lis.push(new obj(ob));
}

function refresh(){
	if(amspatiu!=undefined){
		clearInterval(amspatiu);
		document.getElementById('sim').innerHTML='';
	}
	parsp.nob=parsp.lis.length;
	var des=new desen(new spatiu(parsp),document.getElementById('sim'));
	amspatiu=setInterval((des,t) => { des.reprez(); for(i=0;i<des.sp.timefac;i++) des.sp.timp(t); return; }, 25, des, 25);
}
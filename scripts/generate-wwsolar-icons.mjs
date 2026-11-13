// Ícones PNG para Android/iOS gerados no build: sem dependências externas.
// Identidade WW Solar: fundo azul-petróleo + sol amarelo com raio central.
import { deflateSync } from 'node:zlib';
import { mkdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
function crc32(buf){
  let c=0xffffffff;
  for(const x of buf){c^=x;for(let i=0;i<8;i++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);}
  return (c^0xffffffff)>>>0;
}
function chunk(type,data){
  const kind=Buffer.from(type,'ascii');
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([kind,data])));
  return Buffer.concat([len,kind,data,crc]);
}
function distSegment(x,y,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-ax-dx*t,y-ay-dy*t);
}
const bolt=[[.51,.345],[.445,.487],[.505,.487],[.468,.65],[.577,.458],[.513,.458],[.555,.345]];
function inPoly(x,y,p){
  let inside=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [xi,yi]=p[i],[xj,yj]=p[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function png(size){
  const scan=Buffer.alloc((size*4+1)*size);
  const cX=.5,cY=.49;
  for(let y=0;y<size;y++){
    const start=y*(size*4+1);
    for(let x=0;x<size;x++){
      const xx=(x+.5)/size,yy=(y+.5)/size;
      const d=Math.hypot(xx-cX,yy-cY);
      let gold=d<=.185;
      if(!gold){
        for(let k=0;k<8;k++){
          const a=k*Math.PI/4;
          const ax=cX+.242*Math.cos(a),ay=cY+.242*Math.sin(a);
          const bx=cX+.327*Math.cos(a),by=cY+.327*Math.sin(a);
          if(distSegment(xx,yy,ax,ay,bx,by)<.017){gold=true;break;}
        }
      }
      let color=gold?[255,192,53,255]:[14,32,35,255];
      if(inPoly(xx,yy,bolt))color=[14,32,35,255];
      const p=start+1+x*4;
      scan[p]=color[0];scan[p+1]=color[1];scan[p+2]=color[2];scan[p+3]=color[3];
    }
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);
  ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan,{level:9})),
    chunk('IEND',Buffer.alloc(0))
  ]);
}
const dir=join(process.cwd(),'dist-cliente-dev','icons');
await mkdir(dir,{recursive:true});
for(const [file,size] of [['ww-solar-192.png',192],['ww-solar-512.png',512],['apple-touch-icon.png',180]]){
  await writeFile(join(dir,file),png(size));
}
console.log('Ícones PWA gerados: 192, 512 e Apple Touch 180 px.');

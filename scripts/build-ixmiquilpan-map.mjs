// Build from a small official OSM API extract, not raster tiles. Derived map data
// remains ODbL and is distributed with source, projection and attribution.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {tilePoint} from '../src/admin/salesModel.js';
const input=process.argv[2];
if(!input)throw new Error('Pass a local .osm extract as the first argument.');
const xml=await readFile(input,'utf8'),nodes=new Map();
const attributes=value=>Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));
for(const match of xml.matchAll(/<node\b([^>]+)>/g)){const value=attributes(match[1]);nodes.set(value.id,{lat:Number(value.lat),lng:Number(value.lon)});}
const center=tilePoint(20.4903,-99.2015),origin={x:center.x-330,y:center.y-175},paths={minor:'',major:'',water:'',parks:''};
let features=0;
for(const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)){
  const tags=Object.fromEntries([...match[2].matchAll(/<tag\b([^>]+)\/>/g)].map(row=>{const value=attributes(row[1]);return [value.k,value.v];}));
  const kind=tags.waterway&&['river','canal','stream'].includes(tags.waterway)?'water':tags.leisure==='park'?'parks':['primary','secondary','tertiary','primary_link','secondary_link','tertiary_link'].includes(tags.highway)?'major':['residential','unclassified','living_street'].includes(tags.highway)?'minor':null;
  if(!kind)continue;
  const points=[...match[2].matchAll(/<nd\b([^>]+)\/>/g)].map(row=>nodes.get(attributes(row[1]).ref)).filter(Boolean).map(value=>{const point=tilePoint(value.lat,value.lng);return {x:point.x-origin.x,y:point.y-origin.y};});
  if(points.length<2)continue;
  let previous;const kept=points.filter((point,index)=>{if(!previous||index===points.length-1||Math.hypot(point.x-previous.x,point.y-previous.y)>1){previous=point;return true;}return false;});
  paths[kind]+=kept.map((point,index)=>`${index?'L':'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('')+(kind==='parks'?'Z':'');features++;
}
const result={source:'https://api.openstreetmap.org/api/0.6/map?bbox=-99.235,20.477,-99.17,20.508',license:'ODbL-1.0',licenseURL:'https://opendatacommons.org/licenses/odbl/1-0/',attribution:'© OpenStreetMap contributors',bounds:[-99.235,20.477,-99.17,20.508],projection:{type:'WebMercatorPixel',zoom:13,origin,viewBox:[0,0,660,350]},features,paths};
await mkdir('public/maps',{recursive:true});await writeFile('public/maps/ixmiquilpan.json',JSON.stringify(result));
console.log(JSON.stringify({features,bytes:JSON.stringify(result).length,nodes:nodes.size}));

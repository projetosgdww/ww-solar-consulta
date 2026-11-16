// Regras puras do snapshot de cotação WW Solar. Compatível com Deno (Edge) e Node (testes).
// O cliente não informa preço; todos os vínculos são conferidos com o catálogo do servidor.
const tiers=[
  [3,'PRJ-B-003'],[10,'PRJ-B-010'],[20,'PRJ-B-020'],
  [30,'PRJ-B-030'],[40,'PRJ-B-040'],[50,'PRJ-B-050'],[60,'PRJ-B-060']
];
function projectForKwp(kwp){
  const n=Number(kwp);
  if(!Number.isFinite(n)||n<=0||n>60)return null;
  if(n<=3)return 'PRJ-B-003';
  for(let i=1;i<tiers.length;i++){
    if(i===tiers.length-1?n<=tiers[i][0]:n<tiers[i][0])return tiers[i][1];
  }
  return null;
}
function powerKwp(kit){
  const payload=kit?.payload||{};
  const kwp=Number(payload.potenciaKwp);
  if(Number.isFinite(kwp)&&kwp>0&&kwp<=100)return kwp;
  const panels=Number(payload.placas),wp=Number(payload.moduloWp);
  if(Number.isInteger(panels)&&panels>0&&Number.isFinite(wp)&&wp>0)
    return panels*wp/1000;
  return null;
}
export class BadProjectAssociation extends Error{
  constructor(reason){super(reason);this.name='BadProjectAssociation';}
}
export function verifyProjectAssociations(lines,products){
  if(!Array.isArray(lines)||!Array.isArray(products))throw new BadProjectAssociation('bad_input');
  const linesById=new Map(lines.map(x=>[x.id,x]));
  const productsById=new Map(products.map(x=>[x.id,x]));
  const claimedKits=new Set(),result=new Map();
  for(const line of lines){
    const metadataPresent=Object.prototype.hasOwnProperty.call(line,'linkedKits')||
      Object.prototype.hasOwnProperty.call(line,'standaloneQty');
    if(!metadataPresent)continue; // Carrinho legado, projeto avulso ou kit sem projeto.
    if(!/^PRJ-B-[0-9]{3}$/.test(line.id))throw new BadProjectAssociation('metadata_on_non_project');
    const project=productsById.get(line.id);
    if(project?.kind!=='piece'||project.payload?.categoria!=='projetos')
      throw new BadProjectAssociation('project_unavailable');
    if(!Array.isArray(line.linkedKits)||line.linkedKits.length>25||
      !Number.isInteger(line.standaloneQty)||line.standaloneQty<0||
      line.standaloneQty>99||line.standaloneQty+line.linkedKits.length!==line.qty)
      throw new BadProjectAssociation('project_quantity_mismatch');
    const linked=[];
    for(const kitId of line.linkedKits){
      if(typeof kitId!=='string'||!/^[A-Za-z0-9-]{3,64}$/.test(kitId)||
        claimedKits.has(kitId)||!linesById.has(kitId))
        throw new BadProjectAssociation('kit_link_invalid_or_duplicate');
      const kit=productsById.get(kitId);
      if(kit?.kind!=='kit'||projectForKwp(powerKwp(kit))!==line.id)
        throw new BadProjectAssociation('project_tier_mismatch');
      claimedKits.add(kitId);
      linked.push({sku:kitId,title:String(kit.title)});
    }
    result.set(line.id,{linked_kits:linked,standalone_qty:line.standaloneQty});
  }
  return result;
}
export function projectAssociationNotes(items){
  const notes=[];
  for(const item of items||[]){
    if(!Array.isArray(item.linked_kits)||!item.linked_kits.length)continue;
    for(const kit of item.linked_kits)
      notes.push('- '+String(kit.title)+' ['+String(kit.sku)+'] — '+String(item.sku));
    if(item.standalone_qty>0)
      notes.push('- '+item.standalone_qty+' projeto(s) avulso(s) da faixa '+String(item.sku));
  }
  return notes.length
    ?['','Projetos elétricos vinculados aos kits (TRT não inclusa):',...notes].join('\n')
    :'';
}

export function selectMapLabels(candidates,{width,height,limit=Infinity,padding=8}){
  const accepted=[];
  for(const label of [...candidates].sort((a,b)=>b.priority-a.priority||String(a.id).localeCompare(String(b.id)))){
    const left=label.x-label.width/2-padding,right=label.x+label.width/2+padding,top=label.y-padding,bottom=label.y+label.height+padding;
    if(left<0||right>width||top<0||bottom>height)continue;
    if(accepted.some(other=>left<other.right&&right>other.left&&top<other.bottom&&bottom>other.top))continue;
    accepted.push({...label,left,right,top,bottom});if(accepted.length>=limit)break;
  }
  return accepted;
}
export function minimumLabelParishes(zoom){return Math.max(1,Math.ceil(100/Math.max(.45,zoom)**1.3));}

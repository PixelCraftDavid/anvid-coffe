export function olderRevision(next,current){
  if(!current||!next)return false;
  if(next.day!==current.day)return next.day<current.day;
  return next.seconds<current.seconds||next.seconds===current.seconds&&(next.nanos<current.nanos||next.nanos===current.nanos&&next.id<current.id);
}
export function mergeDashboardPatch(previous,patch){
  if(!previous||olderRevision(patch.revision,previous.revision))return previous;
  const next={...previous,...patch,summary:{...previous.summary,...patch.summary}};
  if(patch.coupons){
    const known=new Set(patch.coupons.map(row=>row.code));
    next.coupons=[...patch.coupons,...previous.coupons.filter(row=>!known.has(row.code))];
    if(previous.coupons.length>20)next.nextCursor=previous.nextCursor;
  }
  if(patch.activityDay&&previous.activityYear){
    const days=previous.activityYear.days.map(row=>row.day===patch.activityDay.day?patch.activityDay:row);
    next.activityYear={...previous.activityYear,days,total:days.reduce((sum,row)=>sum+(row.count||0),0),activeDays:days.filter(row=>row.count>0).length};
    next.activity=previous.activity?.map(row=>row.day===patch.activityDay.day?patch.activityDay:row);
  }
  return next;
}
export function mergeReviewHead(previous,page){
  if(!previous||!page.count)return page;
  const known=new Set(page.reviews.map(row=>row.id));
  const reviews=[...page.reviews,...previous.reviews.filter(row=>!known.has(row.id))].sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt));
  return {...page,reviews,nextCursor:previous.reviews.length>20?previous.nextCursor:page.nextCursor};
}

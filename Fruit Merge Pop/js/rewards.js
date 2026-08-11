export function dailyInfo(data){
 const now=new Date(); const today=now.toISOString().slice(0,10);
 const rewards=[20,30,50,75,100,150,500];
 return {today,amount:rewards[Math.min(data.dailyDay||0,6)],day:Math.min((data.dailyDay||0)+1,7),claimed:data.lastDaily===today};
}
export function claimDaily(data){
 const info=dailyInfo(data); if(info.claimed)return 0;
 data.coins+=info.amount; data.lastDaily=info.today; data.dailyDay=info.day; return info.amount;
}
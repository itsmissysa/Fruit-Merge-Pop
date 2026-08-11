const KEY="fruitMergeSaveV1";
const DEFAULT={coins:0,highScore:0,level:1,totalMerges:0,bestFruit:0,missions:{},lastDaily:null,dailyDay:0,sound:true};
export function loadData(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {...DEFAULT}}}
export function saveData(data){localStorage.setItem(KEY,JSON.stringify(data))}
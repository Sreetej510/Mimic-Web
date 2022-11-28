var totalRecorded = 0;
var isWakeword = false;
let saveLocation;
let dataFile;


var counterElem = document.querySelector("#count");
var clipTimeEle = document.querySelector("#clipTime");


//set the page for wakeword or corpus
const setPage = () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const type = urlParams.get('type')
    document.querySelector(".container2").classList.add(type);
    if(type == "wakeword"){
        isWakeword = true;
        dataFile = "wakeword"
    }

    var data = JSON.parse(httpGet("/data?file=" + dataFile));
    counterElem.innerHTML = data["count"]

}


const displayAudioDuration = timeS => {
    var timeString = "";
    if(timeS < 60){
        timeString = Math.round(timeS) + " sec"
    }else{
        let mins = Math.floor(timeS/60)
        let secs = Math.round(timeS) % 60;
        timeString =mins + " mins "  + secs+ " sec"
    }
    clipTimeEle.innerHTML = timeString;
}

const httpGet = (url) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}


setPage();
import React from 'react';
import './App.css';
function NewsDataList(props) {
    const numbers = props.numbers;
    function handleClick(e) {
        console.log(props)
        console.log(e.target.parentElement.getElementsByTagName("li")[0].textContent);
        console.log(e.target.parentElement.getElementsByTagName("li")[1].textContent);
        props.onClick(e)
    }
    function resetClick(e) {
        props.onReset(e)
    }
    function callInputButton(e,index,rIdx){
        props.onInput(e,index,rIdx);
    }
    function viewAnswer(arr,buttonArr){
        var str = "";

        for(var i=0;i<arr.length;i++){
            str += buttonArr[arr[i]]+" ";
        }
        return str
    }
    const listItems = numbers.map((number,index) =>{
        var buttonList1 =""
        var buttonList2 =""
        if(number[2].length > 0 && number[6][0]) {
            buttonList1 = number[2].map((number,index) =>{
                return <button id={"shuffleBtn1_"+index} index={index} key={"shuffleBtn1_"+index} onClick={(e) => callInputButton(e,index,0)}>{number}</button>
            });    
            buttonList2 = number[3].map((number,index) =>{
                return <button id={"shuffleBtn2_"+index} index={index} key={"shuffleBtn2_"+index} onClick={(e) => callInputButton(e,index,1)}>{number}</button>
            });
        }
        return <div key={index} index={index}>
            <li id={"newsLi"+index+"_0"}>{number[0]}</li>
            <li id={"newsLi"+index+"_1"}>{number[1]}</li>
            <div>{buttonList1}</div>
            <div>{buttonList2}</div>
            <li id={"newsLi"+index+"_2"}>{number[6][1] ? number[4]: ""}</li>
            <li id={"newsLi"+index+"_3"}>{number[6][1] ? number[5]: ""}</li>
            <button id={"newsBtn"+index} onClick={handleClick}>해석하기</button><button id={"resetBtn"+index} onClick={resetClick}>원본보기</button><br />
            <div><text>{viewAnswer(number[7],number[2])}</text></div>
            <div><text>{viewAnswer(number[8],number[3])}</text></div>
            </div>
    });
    return (<ul id="ulId">{listItems}</ul>);
}
function Question(props) {
    const numbers = props.numbers;
    const index = props.selectIndex
    return <div>
                <span id={"newsLi"+"_0"}>{numbers=="" ? "" : numbers[index][0]}</span><br></br>
                <span id={"newsLi"+"_1"}>{numbers=="" ? "" : numbers[index][1]}</span>
            </div>
}
function ButtonList(props){
    const numbers = props.numbers;
    const index = props.selectIndex
    const className = props.className

    // if(className =="question-input")
    //     props.onInput(e,index,0);
    // else 
    //     props.onInput(e,index,1);
    function callInputButtonIdx(e,cIdx,rIdx){
         props.onInput(index,cIdx,rIdx)
    }
    var buttonList1 =""
    var buttonList2 =""
    if(numbers!="" && numbers[index][2].length > 0) {
        buttonList1 = numbers[index][2].map((number,idx) =>{
            if(props.numbers[index][7].indexOf(idx) == -1)
                return <button id={"shuffleBtn1_"+idx} index={idx} key={"shuffleBtn1_"+idx} onClick={(e) => callInputButtonIdx(e,idx,0)}>{number}</button>
            else
                return ""
        });    
        buttonList2 = numbers[index][3].map((number,idx) =>{
            if(props.numbers[index][8].indexOf(idx) == -1)
                return <button id={"shuffleBtn2_"+idx} index={idx} key={"shuffleBtn2_"+idx} onClick={(e) => callInputButtonIdx(e,idx,1)}>{number}</button>
            else
                return ""
        });

        console.log(numbers[index])
    }   

    return <div className={className}>
                <div>{buttonList1}</div>
                <div>{buttonList2}</div>
            </div>
}
function Answer(props) {
    const numbers = props.numbers;
    const index = props.selectIndex

    function callInputButtonIdx(e,cIdx,rIdx){

    }

    function viewAnswer(arr,buttonArr){
        var str = "";

        str = arr.map((element) =>{
            return <button onClick={(e) => callInputButtonIdx(e,index,0)}>{buttonArr[element]}</button>
        });
        console.log(str);
        return <div>{str}</div>
    }


    return <div>
                <div>{numbers=="" ? "" : viewAnswer(numbers[index][7],numbers[index][2])}</div>
                <div>{numbers=="" ? "" : viewAnswer(numbers[index][8],numbers[index][3])}</div>
            </div>

}
class App extends React.Component {
    constructor(props) {
        super(props);
        /*
            newsList[0] : title
            newsList[1] : description

            newsList[2] : translate shuffle title
            newsList[3] : translate shuffle description

            newsList[4] : translate title
            newsList[5] : translate description

            newsList[6] : this row Flag
            newsList[6][0] : (true / false) show/hide translate shuffle title, description
            newsList[6][1] : (true / false) show/hide translate title, description

            newsList[7] : user Title Input
            newsList[8] : user Description Input
        */
        this.state = {
            newsList: [],
            title: '',
            discription: '',
            selectIndex: 0
        }
    }      
    callTranslate = async (e) => {
        // const response = await (await fetch('http://localhost:3000/viewNews')).json()
        var idx = parseInt(e.target.parentElement.getAttribute("index"))
        var hardData = "\n"+e.target.parentElement.getElementsByTagName("li")[0].textContent+"\n"+e.target.parentElement.getElementsByTagName("li")[1].textContent
        const response = await (await fetch('http://localhost:3000/translate/',{
            method : "POST",
            body:JSON.stringify({data:hardData}),
            headers:{
                'Content-Type': 'application/json'
            }            
        })).json()
        var newTranslateList = this.state.newsList;
        newTranslateList[idx][2] = this.shake_it_String(response.message.result.translatedText.split("\n")[0])
        newTranslateList[idx][3] = this.shake_it_String(response.message.result.translatedText.split("\n")[1])
        newTranslateList[idx][4] = (response.message.result.translatedText.split("\n")[0])
        newTranslateList[idx][5] = (response.message.result.translatedText.split("\n")[1])
        this.setState({ newsList: newTranslateList });
        console.log(response)
        // console.log(response)
    }
    callTranslateIdx = async (idx) => {
        // const response = await (await fetch('http://localhost:3000/viewNews')).json()
        var hardData = "\n"+this.state.newsList[idx][0]+"\n"+this.state.newsList[idx][1]
        const response = await (await fetch('http://localhost:3000/translate/',{
            method : "POST",
            body:JSON.stringify({data:hardData}),
            headers:{
                'Content-Type': 'application/json'
            }            
        })).json()
        var newTranslateList = this.state.newsList;
        newTranslateList[idx][2] = this.shake_it_String(response.message.result.translatedText.split("\n")[0])
        newTranslateList[idx][3] = this.shake_it_String(response.message.result.translatedText.split("\n")[1])
        newTranslateList[idx][4] = (response.message.result.translatedText.split("\n")[0])
        newTranslateList[idx][5] = (response.message.result.translatedText.split("\n")[1])
        this.setState({ newsList: newTranslateList });
        console.log(response)
        // console.log(response)
    }
    callInputButtonIdx = async (idx,index,rIdx) => {
        var newTranslateList = this.state.newsList;
        if(newTranslateList[idx][7+rIdx].indexOf(index) != -1)
            newTranslateList[idx][7+rIdx].splice(newTranslateList[idx][7+rIdx].indexOf(index), 1);
        else
            newTranslateList[idx][7+rIdx].push(index);
        this.setState({ newsList: newTranslateList });
    }
    callInputButton = async (e,index,rIdx) => {
        var idx = parseInt(e.target.parentElement.parentElement.getAttribute("index"))
        var newTranslateList = this.state.newsList;

        console.log(e)

        if(newTranslateList[idx][7+rIdx].indexOf(index) != -1)
            newTranslateList[idx][7+rIdx].splice(newTranslateList[idx][7+rIdx].indexOf(index), 1);
        else
            newTranslateList[idx][7+rIdx].push(index);
        this.setState({ newsList: newTranslateList });
    }
    callOutputButton = async (e) => {
        numbers[index][7+rIdx].splice(cIdx,1);
        
        this.setState({ newsList: numbers });
    }

    callOrgData = async (e) => {
        var idx = parseInt(e.target.parentElement.getAttribute("index"))
        var newTranslateList = this.state.newsList;
        if(newTranslateList[idx][2] === ""){
            this.callTranslate(e)
        }
        newTranslateList[idx][6][1] = newTranslateList[idx][6][1] ? false :true
        this.setState({ newsList: newTranslateList });
    }
    callTranDataIdx = async (idx) => {
        var newTranslateList = this.state.newsList;
        if(newTranslateList[idx][2] === ""){
            this.callTranslateIdx(idx)
        }
        newTranslateList[idx][6][0] = newTranslateList[idx][6][0] ? false :true
        newTranslateList[idx][7] = []
        this.setState({ newsList: newTranslateList });
    }
    shake_it_String(str){
        //Fisher–Yates shuffle 알고리즘
        var arr = str.split(" ");
        console.log(arr);
        for(var i=arr.length-1;i>=0;i--){
            var ranIdx = parseInt(Math.random()*i)
            var tmp;
            tmp = arr[ranIdx]
            arr[ranIdx] = arr[i];
            arr[i] = tmp;
        }
        console.log(arr);
        return arr;
    }
    componentDidMount() {
        this.callAPI()
    }
    callAPI = async () => {
        const response = await (await fetch('http://localhost:3000/viewNews')).json()
        // 1const response = await fetch('http://localhost:3000/translate')
        if(response.length === 0){
            var hardData = [
                ["House Lawmakers Condemn Big Tech’s ‘Monopoly Power’ and Urge Their Breakups","In a report led by Democrats, lawmakers said Apple, Amazon, Google and Facebook needed to be checked and recommended they be restructured and that antitrust laws be reformed.","","","","",[false,false],[],[]],
                ["12 Accusations in the Damning House Report on Amazon, Apple, Facebook and Google","Lawmakers said they found multiple problems with each of the four giant tech companies.","","","","",[false,false],[],[]],
                ["Facebook Amps Up Its Crackdown on QAnon","The company said an earlier effort to curb the conspiracy movement’s growth didn’t properly address its increasing popularity.","","","","",[false,false],[],[]],
                ["WeChat Unites and Divides in America","The app, which unites families but also spreads Chinese propaganda, faces a ban in the United States.","","","","",[false,false],[],[]],
                ["Trump Moves to Tighten Visa Access for High-Skilled Foreign Workers","Four weeks before the election, the Trump administration has announced stricter rules for the H-1B visa program, which U.S. companies have long valued.","","","","",[false,false],[],[]],
                ["No, the Coronavirus Is Not Like the Flu","Experts have said repeatedly that the coronavirus poses a far more serious threat than influenza viruses.","","","","",[false,false],[],[]],
                ["Seeking a Partner for the End of the World","Anticipating ugly months to come, Americans are dating with an intention that some experts say that they haven’t seen before.","","","","",[false,false],[],[]],
                ["Big Tech Was Their Enemy, Until Partisanship Fractured the Battle Plans","A House report on how to limit the reach of Apple, Amazon, Google and Facebook has been delayed as Democrats and Republicans split on remedies.","","","","",[false,false],[],[]]
            ]
            this.setState({ newsList: hardData });
        }
        else{
            for(var i=0;i<response.length;i++){
                response[i].push("")
                response[i].push("")
                response[i].push("")
                response[i].push("")
                response[i].push([false,false]);
                response[i].push([])
                response[i].push([])
            }
            this.setState({ newsList: response });
        }
        this.callTranslateIdx(this.state.selectIndex)
        console.log(response)    
    }
    update() {
        this.setState({
            newStuff: true
        });
    }
    
    render() {
        var news = [];
        const newsList = this.state.newsList
        for(var i=0;i<newsList.length;i++){
            news.push(newsList[i]);
        }

        return (
            <div className="App" >
                <header>
                </header>
                <main>
                    <div className="question">
                        <div>
                            <h1>한국어로 번역하세요.</h1>
                        </div>
                        <div className="question-data">
                            <Question 
                                selectIndex={this.state.selectIndex}
                                numbers={this.state.newsList} 
                            >
                            </Question>
                            <div>
                                <Answer 
                                    numbers={this.state.newsList}
                                    selectIndex={this.state.selectIndex}
                                />
                                <ButtonList
                                    numbers={this.state.newsList}
                                    selectIndex={this.state.selectIndex}
                                    onInput={this.callInputButtonIdx} 
                                    className="question-output"
                                />
                            </div>
                            <div className="bottom">
                                <button>미제출(해석보기)</button>
                                <button>제출</button>
                                

                            </div>
                        </div>
                    </div>                        

                    <div className="BBC-List">
                        <h1>Please write in Korean.</h1>
                        <NewsDataList 
                            numbers={this.state.newsList} 
                            onInput={this.callInputButton} 
                            onClick={this.callTranData} 
                            onReset={this.callOrgData} 
                            translateList={this.state.translateList} />

                        <ul >
                            <li>title</li>
                            <li>discription</li>
                        </ul>
                        <ul>
                            <li>title3</li>
                            <li>discription3</li>
                        </ul>
                    </div>
                </main>
                <footer></footer>
            </div>
        );
    }
}

export default App;

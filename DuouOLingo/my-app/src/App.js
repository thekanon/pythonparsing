import React from 'react';
import './App.css';
function Question(props) {
    const numbers = props.numbers;
    const index = props.selectIndex
    return <div>
                <span id={"newsLi"+"_0"}>{numbers=="" ? "" : numbers[index][0]}</span><br></br><br></br>
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
    let line = (buttonList1 =="" && buttonList2 == "") ? <hr></hr> : "";
    
    return <div className={className}>
                <div>{buttonList1}</div>
                <div>{line}</div>
                <div>{buttonList2}</div>
            </div>
}
function Answer(props) {
    const numbers = props.numbers;
    const index = props.selectIndex

    function callOutputButtonIdx(e,cIdx,rIdx){
        props.onOutput(index,cIdx,rIdx)
    }

    function ondragover(e){
        console.log(e.dataTransfer);
    }


    function viewAnswer(arr,buttonArr,rIdx){
        var str = "";
        

        str = arr.map((element,index) =>{
            return <button onClick={(e) => callOutputButtonIdx(e,index,rIdx)} onDragOver={(e) => ondragover(e)} draggable="true" key={index}>{buttonArr[element]}</button>
        });
        console.log(str);
        return <div>{str}</div>
    }
    let line = "";
    if(numbers !=""){
        if(numbers[index][7]!="" && numbers[index][8]!="")
            line =<hr></hr> 
    }
    return <div>
                <div>{numbers=="" ? "" : viewAnswer(numbers[index][7],numbers[index][2],0)}</div>
                <div>{line}</div>
                <div>{numbers=="" ? "" : viewAnswer(numbers[index][8],numbers[index][3],1)}</div>
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
    callOutputButtonIdx = async (index,cIdx,rIdx) => {
        const numbers = this.state.newsList
        numbers[index][7+rIdx].splice(cIdx,1);
        console.log(numbers[index][7+rIdx])
        this.setState({ newsList: numbers });
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
    callSkip= async () => {
        const selectIndex = this.state.selectIndex+1
        this.setState({selectIndex:selectIndex});
        console.log("callSkip! selectIndex is "+selectIndex)
        this.callTranslateIdx(selectIndex)
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
                    <div className="mainContainer">
                        <div className="question-data">
                            <Question 
                                selectIndex={this.state.selectIndex}
                                numbers={this.state.newsList} 
                            >
                            </Question>
                        </div>
                        <div className="answer-data">
                            <Answer 
                                numbers={this.state.newsList}
                                selectIndex={this.state.selectIndex}
                                onOutput={this.callOutputButtonIdx} 
                            />
                        </div>                        
                    </div>                        
                    {/* <div draggable="true" ondragstart="event.dataTransfer.setData('text/plain', 'This text may be dragged')">
                    This text <strong>may</strong> be dragged.
                    </div> */}
                    {/* <div className="BBC-List">
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
                    </div> */}
                </main>
                <footer>
                    <div className="bottom">
                        <div className="answer-input">
                            <ButtonList
                                numbers={this.state.newsList}
                                selectIndex={this.state.selectIndex}
                                onInput={this.callInputButtonIdx} 
                            />
                        </div>

                        <button onClick={this.callSkip}>다음</button>
                        <button>정답</button>
                    </div>
                </footer>
            </div>
        );
    }
}

export default App;

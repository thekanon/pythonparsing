import React from 'react';
import './App.css';
import Question from "./Components/Question.js";
import ButtonList from "./Components/ButtonList.js";
import Answer from "./Components/Answer.js";
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
            selectIndex: 0
        }
    }
    callTranslateIdx = async (idx) => {
        // const response = await (await fetch('http://1eed00.hopto.org:3000/viewNews')).json()
        var hardData = "\n" + this.state.newsList[idx][0] + "\n" + this.state.newsList[idx][1]
        // const response = await (await fetch('http://1eed00.hopto.org:3000/translate/', {
        //     method: "POST",
        //     body: JSON.stringify({ data: hardData }),
        //     headers: {
        //         'Content-Type': 'application/json'
        //     }
        // })).json()

        //Test
        let response = {};
        response.message = {}
        response.message.result = {}
        response.message.result.translatedText = "코비드-19: 영국에서 새로운 4주간의 폐쇄가 시행된다.\n이 폐쇄는 12월 2일까지 시행되며 3개 계층의 지역 규제를 대체한다."

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
    callSkip(selectIndex) {
        this.setState({selectIndex:selectIndex});
        console.log("callSkip! selectIndex is "+selectIndex)
        this.callTranslateIdx(selectIndex)
    }
    callAnswer(selectIndex,numbers) {
        alert(numbers[selectIndex][4])
        alert(numbers[selectIndex][5])
    }
    callDrop = async (index,rIdx,data) => {
        let numbers = this.state.newsList;
        const selectIndex = this.state.selectIndex
        const addData = numbers[selectIndex][7+rIdx][data]
        
        numbers[selectIndex][7+rIdx].splice(data,1);
        numbers[selectIndex][7+rIdx].splice(index,0,addData);
        
        this.setState({ newsList: numbers });
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
        var response = await (await fetch('http://1eed00.hopto.org:3000/viewNews')).json()
        // 1const response = await fetch('http://1eed00.hopto.org:3000/translate')
        // response = []
        if (response.length === 0) {
            var hardData = [
                ["Lena is preparing for an important coding competition that is preceded by a number of sequential preliminary contests.",
                    "Initially, her luck balance is 0. She believes in 'saving luck', and wants to check her theory. Each contest is described by two integers, L[i] and T[i]:",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    [false, false],
                    [],
                    []
                ],
                ["She can lose all three contests to maximize her luck at 10. If k=1, she has to win at least 1 of the 2 important contests.",
                    "She would choose to win the lowest value important contest worth 1. Her final luck will be 5+4-1=8.",
                    "",
                    "",
                    "",
                    "",
                    [false, false],
                    [],
                    []
                ],
                ["12 Accusations in the Damning House Report on Amazon, Apple, Facebook and Google", "Lawmakers said they found multiple problems with each of the four giant tech companies.", "", "", "", "", [false, false], [], []],
                ["Facebook Amps Up Its Crackdown on QAnon", "The company said an earlier effort to curb the conspiracy movement’s growth didn’t properly address its increasing popularity.", "", "", "", "", [false, false], [], []],
                ["WeChat Unites and Divides in America", "The app, which unites families but also spreads Chinese propaganda, faces a ban in the United States.", "", "", "", "", [false, false], [], []],
                ["Trump Moves to Tighten Visa Access for High-Skilled Foreign Workers", "Four weeks before the election, the Trump administration has announced stricter rules for the H-1B visa program, which U.S. companies have long valued.", "", "", "", "", [false, false], [], []],
                ["No, the Coronavirus Is Not Like the Flu", "Experts have said repeatedly that the coronavirus poses a far more serious threat than influenza viruses.", "", "", "", "", [false, false], [], []],
                ["Seeking a Partner for the End of the World", "Anticipating ugly months to come, Americans are dating with an intention that some experts say that they haven’t seen before.", "", "", "", "", [false, false], [], []],
                ["Big Tech Was Their Enemy, Until Partisanship Fractured the Battle Plans", "A House report on how to limit the reach of Apple, Amazon, Google and Facebook has been delayed as Democrats and Republicans split on remedies.", "", "", "", "", [false, false], [], []]
            ]
            this.setState({ newsList: hardData });
        }
        else {
            for (var i = 0; i < response.length; i++) {
                response[i].push("")
                response[i].push("")
                response[i].push("")
                response[i].push("")
                response[i].push([false, false]);
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
        for (var i = 0; i < newsList.length; i++) {
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
                                callDrop={this.callDrop}
                            />
                        </div>
                    </div>
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

                        <button onClick={(e) => { this.callSkip(this.state.selectIndex+1) }}>다음</button>
                        <button onClick={(e) => { this.callAnswer(this.state.selectIndex,this.state.newsList) }}>정답</button>
                    </div>
                </footer>
            </div>
        );
    }
}

export default App;

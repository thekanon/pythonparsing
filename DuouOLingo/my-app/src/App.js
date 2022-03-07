import React from 'react';

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getFirebaseConfig } from './firebase/fBase';

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
            selectIndex: 0,
            footerStyle: {},
            changeFlag: true,
            menuFlag: false,
            menuAccess: "menu_close",
            menuClass: "foldMenu"
        }
    }
    callTranslateIdx = async (idx) => {
        // const response = await (await fetch('http://1eed00.hopto.org:3000/viewNews')).json()
        // var hardData = "\n" + this.state.newsList[idx][0] + "\n" + this.state.newsList[idx][1]
        var hardData = idx
        console.log(hardData)
        const response = await (await fetch('http://222.112.129.129:3001/tranIdx?idx=' + idx)).json()
        //Test
        // let response = {};
        // response.message = {}
        // response.message.result = {}
        // response.message.result.translatedText = "레나는 여러 차례 순차 예선전을 앞두고 중요한 코딩 대회를 준비하고 있다.\n처음에, 그녀의 행운의 균형은 0이다. 그녀는 '행운을 살린다'고 믿으며, 자신의 이론을 확인하고 싶어한다. 각 경기는 L[i]와 T[i]의 두 정수로 설명된다."
        console.log(response)
        var newTranslateList = this.state.newsList;
        newTranslateList[idx][2] = this.shake_it_String(response[0])
        newTranslateList[idx][3] = this.shake_it_String(response[1])
        newTranslateList[idx][4] = (response[0])
        newTranslateList[idx][5] = (response[1])
        this.setState({ newsList: newTranslateList });
        this.setAutoHeight()
        console.log(response)
        // console.log(response)
    }
    callInputButtonIdx = async (idx, index, rIdx) => {
        var newTranslateList = this.state.newsList;
        if (newTranslateList[idx][7 + rIdx].indexOf(index) != -1)
            newTranslateList[idx][7 + rIdx].splice(newTranslateList[idx][7 + rIdx].indexOf(index), 1);
        else
            newTranslateList[idx][7 + rIdx].push(index);
        this.setState({ newsList: newTranslateList });
        this.setState({ changeFlag: true })
    }
    callOutputButtonIdx = async (cIdx, rIdx) => {
        const numbers = this.state.newsList
        const selectIndex = this.state.selectIndex
        numbers[selectIndex][7 + rIdx].splice(cIdx, 1);
        console.log(numbers[selectIndex][7 + rIdx])
        this.setState({ newsList: numbers });
        this.setState({ changeFlag: true })
    }
    callSubmit(selectIndex, numbers) {
        let str1 = numbers[selectIndex][4].split(" ")
        let str2 = numbers[selectIndex][5].split(" ")
        let score1 = 0;
        let score2 = 0;
        for (let i = 0; i < str1.length; i++) {
            if (str1[i] == numbers[selectIndex][2][numbers[selectIndex][7][i]]) {
                score1 += (100 / str1.length)
            }
        }
        for (let i = 0; i < str2.length; i++) {
            if (str2[i] == numbers[selectIndex][3][numbers[selectIndex][8][i]]) {
                score2 += (100 / str2.length)
            }
        }
        if (score1 > 80 && score2 > 80) {
            const idx = this.state.selectIndex + 1
            alert("1번문장 " + Math.round(score1) + "점\n2번문장 " + Math.round(score2) + "점\n다음 문제로 넘어갑니다.");
            this.callSkip(this.state.selectIndex + 1)
        } else {
            alert("1번문장 " + Math.round(score1) + "점\n2번문장 " + Math.round(score2) + "점\n다시 풀어보세요.");
        }
    }
    callSkip(selectIndex) {
        this.setState({ selectIndex: selectIndex });
        console.log("callSkip! selectIndex is " + selectIndex)
        this.callTranslateIdx(selectIndex)
    }
    callAnswer(selectIndex, numbers) {
        alert(numbers[selectIndex][4])
        alert(numbers[selectIndex][5])
    }
    callDrop = async (index, rIdx, data) => {
        let numbers = this.state.newsList;
        const selectIndex = this.state.selectIndex
        const addData = numbers[selectIndex][7 + rIdx][data]

        numbers[selectIndex][7 + rIdx].splice(data, 1);
        numbers[selectIndex][7 + rIdx].splice(index, 0, addData);

        this.setState({ newsList: numbers });
    }
    shake_it_String(str) {
        //Fisher–Yates shuffle 알고리즘
        var arr = str.split(" ");
        for (var i = arr.length - 1; i >= 0; i--) {
            var ranIdx = parseInt(Math.random() * i)
            var tmp;
            tmp = arr[ranIdx]
            arr[ranIdx] = arr[i];
            arr[i] = tmp;
        }
        return arr;
    }
    componentDidMount() {
        this.callAPI()
        initializeApp(getFirebaseConfig());

    }
    componentDidUpdate(prevProps) {
        if (this.state.changeFlag) {
            console.log("render");
            this.setAutoHeight()
        }
    }
    setAutoHeight() {
        let footer = {}
        if (document.getElementsByTagName("main").length != 0 && document.getElementsByTagName("footer").length != 0 && window.innerHeight < document.getElementsByTagName("main")[0].offsetHeight + document.getElementsByTagName("footer")[0].offsetHeight) {
            footer = { "position": "relative", "marginTop": "10px" }
        }
        this.setState({ footerStyle: footer })
        this.setState({ changeFlag: false })
    }
    onMenuClick(e) {
        console.log(this.state.menuFlag)
        this.state.menuFlag = !this.state.menuFlag
        if (this.state.menuClass == "foldMenu") {
            this.setState({ menuClass: "expandMenu" })
            this.setState({ menuAccess: "menu_open" })
        } else {
            this.setState({ menuClass: "foldMenu" })
            this.setState({ menuAccess: "menu_close" })
        }
    }
    onGoggleClick = async (event) => {
        console.log(event)
        var provider = new GoogleAuthProvider();
        await signInWithPopup(getAuth(), provider).then(function (result) {
            console.log(result)
        });
    }
    callAPI = async () => {
        let response = await (await fetch('http://222.112.129.129:3001/viewNews')).json()
        // Test logic
        // let response = []
        if (response.length === 0) {
            response = [
                ["Lena is preparing for an important coding competition that is preceded by a number of sequential preliminary contests.",
                    "Initially, her luck balance is 0. She believes in 'saving luck', and wants to check her theory. Each contest is described by two integers, L[i] and T[i]:",
                    "",
                    "",
                    "",
                    "",
                    [],
                    [],
                    [],
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
            await (this.setState({ newsList: response }));
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
                <div className={this.state.menuAccess} onClick={(e) => this.onMenuClick(e)}></div>

                <header>
                    <link
                        rel="stylesheet"
                        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.8.2/css/all.min.css"
                    />
                    <nav className="common_nav">
                        <button onClick={(e) => this.onMenuClick(e)} className="hamburger button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                                <path d="M0 96C0 78.33 14.33 64 32 64H416C433.7 64 448 78.33 448 96C448 113.7 433.7 128 416 128H32C14.33 128 0 113.7 0 96zM0 256C0 238.3 14.33 224 32 224H416C433.7 224 448 238.3 448 256C448 273.7 433.7 288 416 288H32C14.33 288 0 273.7 0 256zM416 448H32C14.33 448 0 433.7 0 416C0 398.3 14.33 384 32 384H416C433.7 384 448 398.3 448 416C448 433.7 433.7 448 416 448z" />
                            </svg>
                        </button>
                        <a className="logo">Parsing To BBC</a>
                        <button className="search">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
                            </svg>
                        </button>
                        <div className={this.state.menuClass}>
                            <ul>
                                <li><button>사용 방법</button></li>
                                <li><button>학습 히스토리</button></li>
                                <li><button>학습 통계</button></li>
                                <li id="logon">
                                    <button onClick={(e) => this.onGoggleClick(e)}>로그인</button>
                                </li>
                            </ul>
                        </div>
                    </nav>
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
                <footer style={this.state.footerStyle}>
                    <div className="bottom">
                        <div className="answer-input">
                            <ButtonList
                                numbers={this.state.newsList}
                                selectIndex={this.state.selectIndex}
                                onInput={this.callInputButtonIdx}
                            />
                        </div>
                        <div className="answer-button">
                            <button onClick={(e) => { this.callSkip(this.state.selectIndex + 1) }}>다음</button>
                            <button onClick={(e) => { this.callSubmit(this.state.selectIndex, this.state.newsList) }}>제출</button>
                            <button onClick={(e) => { this.callAnswer(this.state.selectIndex, this.state.newsList) }}>정답</button>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
}

export default App;

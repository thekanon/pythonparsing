import React from 'react';
import logo from './logo.svg';
import './App.css';
function NewsDataList(props) {
    const numbers = props.numbers;
    function handleClick(e) {
        console.log(props)
        console.log(e.target.parentElement.getElementsByTagName("li")[0].textContent);
        console.log(e.target.parentElement.getElementsByTagName("li")[1].textContent);
        props.onClick(e)
    }
    const listItems = numbers.map((number,index) =>{
        return <div key={index}>
            <li id={"newsLi"+index+"_0"}>{number[0]}</li>
            <li id={"newsLi"+index+"_1"}>{number[1]}</li>
            <button id={"newsBtn"+index} onClick={handleClick}>번역</button><br /></div>
    });
    return (<ul id="ulId">{listItems}</ul>);
}
class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newsList: [],
            translateList: "",
            title: '',
            discription: ''
        }
    }      
    callTranslate = async (e) => {
        // const response = await (await fetch('http://localhost:3000/viewNews')).json()
        var hardData = "1."+e.target.parentElement.getElementsByTagName("li")[0].textContent+"1."+e.target.parentElement.getElementsByTagName("li")[1].textContent
        const response = await (await fetch(`http://localhost:3000/translate/${hardData}`)).json()
        // this.setState({ translateList: response.message.result.translatedText });
        this.setState({ translateList: response.message.result.translatedText});
        console.log(response.message.result.translatedText)
    }    
    componentDidMount() {
        this.callAPI()
    }
    callAPI = async () => {
        const response = await (await fetch('http://localhost:3000/viewNews')).json()
        // 1const response = await fetch('http://localhost:3000/translate')
        if(response.length == 0){
            var hardData = [
                ["House Lawmakers Condemn Big Tech’s ‘Monopoly Power’ and Urge Their Breakups","In a report led by Democrats, lawmakers said Apple, Amazon, Google and Facebook needed to be checked and recommended they be restructured and that antitrust laws be reformed."],
                ["12 Accusations in the Damning House Report on Amazon, Apple, Facebook and Google","Lawmakers said they found multiple problems with each of the four giant tech companies."],
                ["Facebook Amps Up Its Crackdown on QAnon","The company said an earlier effort to curb the conspiracy movement’s growth didn’t properly address its increasing popularity."],
                ["WeChat Unites and Divides in America","The app, which unites families but also spreads Chinese propaganda, faces a ban in the United States."],
                ["Trump Moves to Tighten Visa Access for High-Skilled Foreign Workers","Four weeks before the election, the Trump administration has announced stricter rules for the H-1B visa program, which U.S. companies have long valued."],
                ["No, the Coronavirus Is Not Like the Flu","Experts have said repeatedly that the coronavirus poses a far more serious threat than influenza viruses."],
                ["Seeking a Partner for the End of the World","Anticipating ugly months to come, Americans are dating with an intention that some experts say that they haven’t seen before."],
                ["Big Tech Was Their Enemy, Until Partisanship Fractured the Battle Plans","A House report on how to limit the reach of Apple, Amazon, Google and Facebook has been delayed as Democrats and Republicans split on remedies."]
            ]
            this.setState({ newsList: hardData });
        }
        else
            this.setState({ newsList: response });
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
                    <div className="BBC-List">
                        <h1>Please write in Korean.</h1>
                        <NewsDataList numbers={news} onClick={this.callTranslate} />

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

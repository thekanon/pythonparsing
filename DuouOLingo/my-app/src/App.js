import React from 'react';
import logo from './logo.svg';
import './App.css';
function NewsDataList(props) {
    const numbers = props.numbers;
    function handleClick(e) {
        console.log(e.target.parentElement.getElementsByTagName("li")[0].textContent);
        console.log(e.target.parentElement.getElementsByTagName("li")[1].textContent);
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
            title: '',
            discription: ''
        }
    }      
    componentDidMount() {
        this.callAPI()
    }
    callAPI = async () => {
        const response = await (await fetch('http://localhost:3000/viewNews')).json()
        // const response = await fetch('http://localhost:3000/translate')
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
                        <NewsDataList numbers={news} />

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

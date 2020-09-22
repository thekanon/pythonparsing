import React from 'react';
import logo from './logo.svg';
import './App.css';
function TitleList(props,props2) {
    const numbers = props.numbers;
    const numbers2 = props.numbers2;
    debugger
    const listItems = numbers.map((number) =>
        <li>{number}</li>  
    );  return (<ul>{listItems}</ul>);
}
function DiscriptionList(props) {
    const numbers = props.numbers;
    const listItems = numbers.map((number) =>    <li>{number}</li>  );  return (
      <ul>{listItems}</ul>  );
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
        const response = await (await fetch('http://localhost:3000/translate')).json()
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
                        <ul >
                            <li>title</li>
                            <li>discription</li>
                        </ul>
                            <TitleList numbers={news} />
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
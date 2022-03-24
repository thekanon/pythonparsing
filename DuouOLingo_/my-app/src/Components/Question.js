import React from 'react';
function Question(props) {
    const numbers = props.numbers;
    const index = props.selectIndex
    return <div>
        <span id={"newsLi" + "_0"}>{numbers == "" ? "" : numbers[index][0]}</span><br></br><br></br>
        <span id={"newsLi" + "_1"}>{numbers == "" ? "" : numbers[index][1]}</span>
    </div>
}
export default Question;
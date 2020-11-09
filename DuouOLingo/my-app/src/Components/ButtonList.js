import React from 'react';
function ButtonList(props) {
    const numbers = props.numbers;
    const index = props.selectIndex
    const className = props.className

    function callInputButtonIdx(e, cIdx, rIdx) {
        props.onInput(index, cIdx, rIdx)
    }
    var buttonList1 = ""
    var buttonList2 = ""
    if (numbers != "" && numbers[index][2].length > 0) {
        buttonList1 = numbers[index][2].map((number, idx) => {
            if (props.numbers[index][7].indexOf(idx) == -1)
                return <button id={"shuffleBtn1_" + idx} index={idx} key={"shuffleBtn1_" + idx} onClick={(e) => callInputButtonIdx(e, idx, 0)}>{number}</button>
            else
                return ""
        });
        buttonList2 = numbers[index][3].map((number, idx) => {
            if (props.numbers[index][8].indexOf(idx) == -1)
                return <button id={"shuffleBtn2_" + idx} index={idx} key={"shuffleBtn2_" + idx} onClick={(e) => callInputButtonIdx(e, idx, 1)}>{number}</button>
            else
                return ""
        });

        console.log(numbers[index])
    }
    let line = (buttonList1 == "" && buttonList2 == "") ? <hr></hr> : "";

    return <div className={className}>
        <div>{buttonList1}</div>
        <div>{line}</div>
        <div>{buttonList2}</div>
    </div>
}
export default ButtonList;
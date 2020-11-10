import React from 'react';
import { TouchBackend } from 'react-dnd-touch-backend'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider, useDrag } from 'react-dnd'
import AnswerButton from './AnswerButton'

function Answer(props) {
    const numbers = props.numbers;
    const index = props.selectIndex
    let currentRow = 0

    function onClick(cIdx, rIdx) {
        props.onOutput(cIdx, rIdx)
    }

    function moveButton(dragIndex,index,rIdx){
        props.callDrop(index,rIdx,dragIndex)
    }

    function viewAnswer(arr, buttonArr, rIdx) {
        let str = "";

        str = arr.map((element, index) => {
            return <AnswerButton
                onClick={(cIdx,rIdx) => onClick(cIdx, rIdx)}
                moveButton={(dragIndex,index,rIdx)=>moveButton(dragIndex,index,rIdx)}
                index={index}
                rIdx={rIdx}
                key={index} >{buttonArr[element]}</AnswerButton>
        });
        console.log(str);
        return <div>{str}</div>
    }
    let line = "";
    if (numbers != "") {
        if (numbers[index][7] != "" && numbers[index][8] != "")
            line = <hr></hr>
    }

    const backendOptions = {
        enableMouseEvents: true
    }
    const backendDevice = typeof window.ontouchstart !== 'undefined' ? TouchBackend : HTML5Backend; 

    return <DndProvider  backend={backendDevice} options={backendOptions}>
            <div>{numbers == "" ? "" : viewAnswer(numbers[index][7], numbers[index][2], 0)}</div>
            <div>{line}</div>
            <div>{numbers == "" ? "" : viewAnswer(numbers[index][8], numbers[index][3], 1)}</div>
        </DndProvider >
}
export default Answer;
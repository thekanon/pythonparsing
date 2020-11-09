import React from 'react';
import { TouchBackend } from 'react-dnd-touch-backend'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider, useDrag } from 'react-dnd'
import AnswerButton from './AnswerButton'

function Answer(props) {
    const numbers = props.numbers;
    const index = props.selectIndex
    let currentRow = 0

    function callOutputButtonIdx(e, cIdx, rIdx) {
        props.onOutput(index, cIdx, rIdx)
    }

    function ondragover(event) {
        event.preventDefault();
    }
    function ondragstart(event, index, rIdx) {
        event.dataTransfer.setData("index", index);
        event.dataTransfer.setData("rIdx", rIdx);
        currentRow = rIdx;
    }
    function ondragenter(event, rIdx) {
        console.log(currentRow)
        if (event.target.className == "droptarget" && rIdx == currentRow) {
            event.target.style.border = "3px dotted red";
        }
    }
    function ondragleave(event) {
        if (event.target.className == "droptarget") {
            event.target.style.border = "";
        }
    }
    function ondrop(event, index, rIdx) {
        event.preventDefault();
        var data = parseInt(event.dataTransfer.getData("index"))
        if (rIdx == event.dataTransfer.getData("rIdx"))
            props.callDrop(index, rIdx, data)
        event.target.style.border = "";
    }

    function onDragEnd(event, index, rIdx) {
        console.log(event)
    }

    function viewAnswer(arr, buttonArr, rIdx) {
        let str = "";

        str = arr.map((element, index) => {
            return <AnswerButton
                onClick={(e) => callOutputButtonIdx(e, index, rIdx)}
                onDragOver={(event) => ondragover(event)}
                onDrop={(event) => ondrop(event, index, rIdx)}
                onDragEnter={(event) => ondragenter(event, rIdx)}
                onDragLeave={(event) => ondragleave(event)}
                onDragStart={(event) => ondragstart(event, index, rIdx)}

                onDragEnd={(event) => onDragEnd(event, index, rIdx)}

                index={index}
                rIdx={rIdx}
                numbers = {props.numbers}
                selectIndex = {props.selectIndex}

                draggable="true"
                className="droptarget"
                key={index}>{buttonArr[element]}</AnswerButton>
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
    return <DndProvider  backend={TouchBackend} options={backendOptions}>
            <div>{numbers == "" ? "" : viewAnswer(numbers[index][7], numbers[index][2], 0)}</div>
            <div>{line}</div>
            <div>{numbers == "" ? "" : viewAnswer(numbers[index][8], numbers[index][3], 1)}</div>
            <div>{line}</div>
        </DndProvider >
}
export default Answer;
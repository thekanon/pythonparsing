import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd'

export default function AnswerButton(props) {
    const ref = useRef(null);
    const [{ isDragging }, drag] = useDrag({
        item: { type: "AnswerButton" },
        collect: monitor => ({
            isDragging: !!monitor.isDragging(),
        }),
    })

    const [{ isOver, canDrop }, drop] = useDrop({
        accept: "AnswerButton",
        drop: (item, monitor) => onDrop(item, monitor),
        hover: (item, monitor) => onhover(item, monitor,props),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop()
        })
    })
    function onhover(item, monitor,props) {
        // event.dataTransfer.setData("index", index);
        // event.dataTransfer.setData("rIdx", rIdx);
        // currentRow = rIdx;
        console.log(monitor.targetId)
    }
    function onDrop(item, monitor) {
        // console.log(currentRow)
        // if (event.target.className == "droptarget" && rIdx == currentRow) {
        //     event.target.style.border = "3px dotted red";
        // }
        let number = 2000;
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
    drag(drop(ref));
    return (<button
        ref={ref}
        style={{
            opacity: isDragging ? 0.5 : 1,
            fontSize: 15,
            fontWeight: 'bold',
            cursor: 'move',
        }}
    >
        {props.children}
    </button>
    )
}
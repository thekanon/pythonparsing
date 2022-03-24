import React, { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd'

export default function AnswerButton(props) {
    const ref = useRef(null);
    const [borderFlag, setborderFlag] = useState(false);
    const [{ isDragging }, drag] = useDrag({
        item: { type: "AnswerButton", ref, props },
        collect: monitor => ({
            isDragging: !!monitor.isDragging()
        }),
    })

    const [{ isOver}, drop] = useDrop({
        accept: "AnswerButton",
        drop: (item, monitor) => onDrop(item, monitor,props),
        hover: (item, monitor) => onhover(item, monitor,props),
        collect: (monitor) => ({
            isOver: !!monitor.isOver()
        })
    })
    function onhover(item, monitor,props) {
        if(item.props.index == props.index)
            return
        setborderFlag(true);
    }
    function onDrop(item, monitor) {
        // console.log(currentRow)
        // if (event.target.className == "droptarget" && rIdx == currentRow) {
        //     event.target.style.border = "3px dotted red";
        // }
        const index = props.index
        const dragIndex = item.props.index
        props.moveButton(dragIndex,index,props.rIdx)
    }
    function onClick(){
        props.onClick(props.index,props.rIdx)
    }
    drag(drop(ref));
    let borderStyle = ""
    if(borderFlag && isOver){
         borderStyle = "3px dotted red"
    }
    const style={
        "opacity": isDragging ? 0.5 : 1,
        "fontSize": 15,
        "fontWeight": 'bold',
        "cursor": 'move',
        "border" : borderStyle
    }
    return (<button
        ref={ref}
        style={style}
        onClick={()=>onClick()}
    >
        {props.children}
    </button>
    )
}
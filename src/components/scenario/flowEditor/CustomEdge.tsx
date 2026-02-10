import React from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
  type Edge
} from '@xyflow/react'

export type DeletableEdgeData = {
  label?: string
}

type DeletableEdge = Edge<DeletableEdgeData, 'deletable'>

/** Animated smooth-step edge with a delete button on hover */
const CustomEdge: React.FC<EdgeProps<DeletableEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  selected
}) => {
  const { deleteElements } = useReactFlow()
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected ? '#1677ff' : style?.stroke || '#b1b1b7'
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan"
        >
          {data?.label && (
            <span
              style={{
                fontSize: 10,
                background: '#fff',
                padding: '1px 6px',
                borderRadius: 4,
                border: '1px solid #e0e0e0',
                color: '#666',
                marginRight: 4
              }}
            >
              {data.label}
            </span>
          )}
          <button
            className="edge-delete-btn"
            onClick={(e) => {
              e.stopPropagation()
              deleteElements({ edges: [{ id }] })
            }}
            title="Delete edge"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default CustomEdge

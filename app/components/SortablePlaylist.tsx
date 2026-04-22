"use client"

import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core"

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"
import { useState } from "react"

export default function SortablePlaylist({ items }: any) {
  const [list, setList] = useState(items)

  async function handleDragEnd(event: any) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = list.findIndex((i: any) => i.id === active.id)
    const newIndex = list.findIndex((i: any) => i.id === over.id)

    const newList = arrayMove(list, oldIndex, newIndex)
    setList(newList)

    // 🔥 SAVE AUTOMATSKI
    await fetch("/api/listening-playlist/item/reorder-all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: newList.map((item: any, index: number) => ({
          id: item.id,
          order: index,
        })),
      }),
    })
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={list} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {list.map((item: any) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ item }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-2 rounded bg-white/5 cursor-grab flex justify-between"
    >
      🎵 {item.title || item.url}
    </div>
  )
}
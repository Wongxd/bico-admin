import './rich-editor.css'

import { Node, mergeAttributes } from '@tiptap/core'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  UnderlineIcon,
  Undo2,
  VideoIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { uploadForEditor, type UploadType } from '@/services/upload'

export interface RichEditorProps {
  value?: string
  onChange?: (html: string) => void
  disabled?: boolean
  height?: number
}

interface ToolbarButtonProps {
  title: string
  icon?: ReactNode
  text?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * 扩展 TipTap 视频节点，让编辑器保存和回显标准 video 标签。
 */
const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  /**
   * 声明视频持久化属性，controls 默认开启以保证上传后可直接预览。
   */
  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
        parseHTML: (element) => element.hasAttribute('controls'),
        renderHTML: (attributes) => {
          // controls 为 false 时不输出属性，保持原生 video 的布尔属性语义。
          if (!attributes.controls) {
            return {}
          }

          return { controls: '' }
        },
      },
    }
  },

  /**
   * 只解析带 src 的视频标签，避免空节点进入编辑器内容。
   */
  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  /**
   * 输出标准 video 标签，后端无需理解编辑器私有结构。
   */
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ class: 'rich-editor-video' }, HTMLAttributes)]
  },

  /**
   * 提供插入视频命令，上传成功后可直接写入当前光标位置。
   */
  addCommands() {
    return {
      setVideo:
        (attrs: { src: string }) =>
        ({ commands }: { commands: Editor['commands'] }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              controls: true,
            },
          })
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (attrs: { src: string }) => ReturnType
    }
  }
}

/**
 * 渲染工具栏按钮，统一处理焦点、激活态和禁用态。
 */
function ToolbarButton({
  title,
  icon,
  text,
  active,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      type='button'
      variant={active ? 'default' : 'ghost'}
      size={text ? 'sm' : 'icon'}
      aria-label={title}
      title={title}
      disabled={disabled}
      className={cn(text ? 'h-8 min-w-8 px-2' : 'size-8')}
      onMouseDown={(event) => {
        // 阻止按钮抢走编辑器焦点，否则链式命令会丢失当前选区。
        event.preventDefault()
        onClick()
      }}
    >
      {icon}
      {text}
    </Button>
  )
}

/**
 * 通用富文本编辑器组件，内部使用 TipTap，外部以 HTML 字符串读写。
 */
export function RichEditor({
  value = '',
  onChange,
  disabled,
  height = 420,
}: RichEditorProps) {
  const [uploadingType, setUploadingType] = useState<UploadType | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const extensions = useMemo(() => {
    return [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rich-editor-image',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: '请输入内容...',
      }),
      Video,
    ]
  }, [])

  const editor = useEditor({
    extensions,
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      // TipTap 负责维护文档结构，对外只同步 HTML，便于复用现有接口。
      onChange?.(currentEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const nextValue = value || ''
    const currentValue = editor.getHTML()
    // 外部值变化时才覆盖编辑器内容，避免输入过程中重置光标。
    if (nextValue !== currentValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  /**
   * 设置或清除当前选区链接，空字符串表示主动取消链接。
   */
  function handleSetLink() {
    if (!editor) {
      return
    }

    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('请输入链接地址', previousUrl || '')
    // 用户取消输入时不改变当前选区，避免误删已有链接。
    if (url === null) {
      return
    }

    // 空输入代表清除链接，和取消弹窗保持明确区分。
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  /**
   * 上传图片或视频，并把后端返回的 URL 写入当前编辑器内容。
   */
  async function uploadMedia(file: File, type: UploadType) {
    if (!editor) {
      return
    }

    setUploadingType(type)
    try {
      const response = await uploadForEditor(file, type)
      // 后端统一响应 code 为 0 才表示上传成功，缺少 URL 时不写入内容。
      if (response.code !== 0 || !response.data?.url) {
        throw new Error(response.msg || '上传失败')
      }

      // 图片和视频使用不同节点，避免把 video 当成普通图片内容保存。
      if (type === 'image') {
        editor.chain().focus().setImage({ src: response.data.url }).run()
      } else {
        editor.chain().focus().setVideo({ src: response.data.url }).run()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败'
      toast.error(message)
    } finally {
      setUploadingType(null)
    }
  }

  /**
   * 处理原生文件选择，选择后立即上传并重置 input 便于重复选择同一文件。
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>, type: UploadType) {
    const file = event.target.files?.[0]
    event.target.value = ''
    // 用户取消选择时没有文件，直接结束即可。
    if (!file) {
      return
    }

    void uploadMedia(file, type)
  }

  const toolbarDisabled = !editor || disabled

  return (
    <div className='rich-editor overflow-hidden rounded-md border bg-background'>
      <div className='flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2'>
        <ToolbarButton
          title='撤销'
          icon={<Undo2 />}
          disabled={toolbarDisabled || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          title='重做'
          icon={<Redo2 />}
          disabled={toolbarDisabled || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        />
        <Separator orientation='vertical' className='mx-1 h-6' />
        <ToolbarButton
          title='加粗'
          icon={<Bold />}
          active={editor?.isActive('bold')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title='斜体'
          icon={<Italic />}
          active={editor?.isActive('italic')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title='下划线'
          icon={<UnderlineIcon />}
          active={editor?.isActive('underline')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          title='删除线'
          icon={<Strikethrough />}
          active={editor?.isActive('strike')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          title='行内代码'
          icon={<Code />}
          active={editor?.isActive('code')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        />
        <Separator orientation='vertical' className='mx-1 h-6' />
        <ToolbarButton
          title='标题 1'
          text='H1'
          active={editor?.isActive('heading', { level: 1 })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          title='标题 2'
          text='H2'
          active={editor?.isActive('heading', { level: 2 })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          title='引用'
          icon={<Quote />}
          active={editor?.isActive('blockquote')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          title='无序列表'
          icon={<List />}
          active={editor?.isActive('bulletList')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title='有序列表'
          icon={<ListOrdered />}
          active={editor?.isActive('orderedList')}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <Separator orientation='vertical' className='mx-1 h-6' />
        <ToolbarButton
          title='左对齐'
          icon={<AlignLeft />}
          active={editor?.isActive({ textAlign: 'left' })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          title='居中'
          icon={<AlignCenter />}
          active={editor?.isActive({ textAlign: 'center' })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          title='右对齐'
          icon={<AlignRight />}
          active={editor?.isActive({ textAlign: 'right' })}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        />
        <Separator orientation='vertical' className='mx-1 h-6' />
        <ToolbarButton
          title='链接'
          icon={<LinkIcon />}
          active={editor?.isActive('link')}
          disabled={toolbarDisabled}
          onClick={handleSetLink}
        />
        <ToolbarButton
          title='上传图片'
          icon={<ImageIcon />}
          disabled={!editor || disabled || uploadingType !== null}
          onClick={() => imageInputRef.current?.click()}
        />
        <ToolbarButton
          title='上传视频'
          icon={<VideoIcon />}
          disabled={!editor || disabled || uploadingType !== null}
          onClick={() => videoInputRef.current?.click()}
        />
        <Separator orientation='vertical' className='mx-1 h-6' />
        <ToolbarButton
          title='清除格式'
          icon={<Eraser />}
          disabled={toolbarDisabled}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        />
      </div>

      <input
        ref={imageInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={(event) => handleFileChange(event, 'image')}
      />
      <input
        ref={videoInputRef}
        type='file'
        accept='video/*'
        className='hidden'
        onChange={(event) => handleFileChange(event, 'video')}
      />

      <div className='p-3' style={{ minHeight: height }}>
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <p className='text-sm text-muted-foreground'>编辑器加载中...</p>
        )}
      </div>
    </div>
  )
}

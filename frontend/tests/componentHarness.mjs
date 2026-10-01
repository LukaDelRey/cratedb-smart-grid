import { createRenderer, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import router from '../src/router/index.ts'

function insert(child,parent,anchor){
  if(child.parent) remove(child)
  parent.children??=[]
  const index=anchor?parent.children.indexOf(anchor):-1
  if(index<0) parent.children.push(child)
  else parent.children.splice(index,0,child)
  child.parent=parent
}
function remove(child){
  const siblings=child.parent?.children
  const index=siblings?.indexOf(child)??-1
  if(index>=0) siblings.splice(index,1)
  child.parent=null
}
const renderer=createRenderer({
  createElement:type=>({type,tagName:type.toUpperCase(),children:[],props:{},style:{},classList:{add(){},remove(){}},
    addEventListener(){},removeEventListener(){},setAttribute(){},removeAttribute(){}}),createText:text=>({text}),createComment:text=>({text}),
  insert,remove,
  insertStaticContent(content,parent,anchor){const node={html:content};insert(node,parent,anchor);return [node,node]},
  setText(node,text){node.text=text},setElementText(node,text){node.text=text},
  patchProp(node,key,old,value){node.props??={};node.props[key]=value},parentNode:node=>node.parent,
  nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]??null
})
export function mountUnit(Component,props={},context,renderTemplate=false){
  const app=renderer.createApp(renderTemplate?Component:{...Component,render(){return h('div')}},props)
  app.use(createPinia())
  app.use(router)
  setActivePinia(app.config.globalProperties.$pinia)
  const errors=[]
  app.config.errorHandler=error=>errors.push(error)
  app.config.warnHandler=()=>{}
  const vm=app.mount({children:[]})
  const result={app,vm,state:vm.$.setupState,errors,unmount:()=>app.unmount()}
  context?.after(()=>app.unmount())
  return result
}
export const flush=()=>new Promise(resolve=>setImmediate(resolve))

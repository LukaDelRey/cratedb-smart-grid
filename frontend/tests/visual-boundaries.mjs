// Third-party drawing boundaries only; application component logic is real.
export class Map {
  sources = new globalThis.Map()
  layers = new globalThis.Map()
  handlers = []
  removed = false
  constructor(options={}) { this.options=options; globalThis.__testMaps?.push(this) }
  addSource(id,source) { this.sources.set(id,{...source,setData(data){this.data=data}}) }
  getSource(id) { return this.sources.get(id) }
  removeSource(id) { this.sources.delete(id) }
  addLayer(layer) { this.layers.set(layer.id,layer) }
  getLayer(id) { return this.layers.get(id) }
  removeLayer(id) { this.layers.delete(id) }
  on(...args) { this.handlers.push(args); return this }
  off(...args) { this.handlers=this.handlers.filter(item=>!args.every((arg,i)=>arg===item[i])); return this }
  addControl() {}
  getCanvas() { return {style:{}} }
  setFilter(id,filter) { if(this.layers.has(id)) this.layers.get(id).filter=filter }
  setPaintProperty(id,key,value) { if(this.layers.has(id)) this.layers.get(id).paint[key]=value }
  moveLayer() {}
  getStyle() { return { layers:[...this.layers.values()] } }
  isStyleLoaded() { return true }
  getZoom() { return 10 }
  flyTo(options) { this.lastFlight=options }
  easeTo(options) { this.lastFlight=options }
  queryRenderedFeatures() { return [] }
  remove() { this.removed=true }
}
export class Popup {
  on(event,handler) { this.handlers??={}; this.handlers[event]=handler; return this }
  setLngLat(value) { this.coordinates=value; return this }
  setHTML(value) { this.html=value; return this }
  addTo(map) { this.map=map; return this }
  remove() { this.removed=true; this.handlers?.close?.() }
  getElement() { return {querySelector:()=>null} }
}
export class NavigationControl {}
export const VueFlow={render:()=>null}, Background=VueFlow, Controls=VueFlow
export const MarkerType={ArrowClosed:'arrowclosed'}
export const LMap=VueFlow, LTileLayer=VueFlow, LMarker=VueFlow, LPopup=VueFlow, LCircleMarker=VueFlow, LTooltip=VueFlow, LPolyline=VueFlow
export default { Map, Popup, NavigationControl, render:()=>null }

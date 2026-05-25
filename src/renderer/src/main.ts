import { TripleTriadApp } from './app'

const canvas = document.getElementById('game')
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #game canvas')
}

new TripleTriadApp(canvas)

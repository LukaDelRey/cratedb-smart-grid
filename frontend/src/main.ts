import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router';
import { Quasar } from 'quasar';

import './styles/component-styles.css';
import 'quasar/src/css/index.sass';
import '@quasar/extras/material-icons/material-icons.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles/global.css';

const app = createApp(App);

app.use(createPinia());

app.use(router);

app.use(Quasar);

app.mount('#app');

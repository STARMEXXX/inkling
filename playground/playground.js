import { inky } from '../ui/inky.js';

document.getElementById('mascot').innerHTML = inky('happy', 84);
if (new URLSearchParams(location.search).has('welcome')) {
  document.getElementById('welcome').classList.add('show');
}

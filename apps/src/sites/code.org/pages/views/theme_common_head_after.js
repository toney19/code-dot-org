import 'details-element-polyfill';
import 'lazysizes';
import 'lazysizes/plugins/unveilhooks/ls.unveilhooks';
import {isUnsupportedBrowser} from '@cdo/apps/util/browser-detector';
import {initHamburger} from '@cdo/apps/hamburger/hamburger';
import {loadVideos} from '@cdo/apps/util/loadVideos';

$(document).ready(function () {
  if (isUnsupportedBrowser()) {
    $("#warning-banner").show();
  }
});

initHamburger();
window.loadVideos = loadVideos;

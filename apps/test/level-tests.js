import 'babel-polyfill';
import { throwOnConsoleErrorsEverywhere } from './util/testUtils';


describe('integration tests', () => {
  throwOnConsoleErrorsEverywhere();
  require('./integration/levelTests.js');
});

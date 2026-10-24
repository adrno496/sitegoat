import {defineConfig} from '@playwright/test';import config from './playwright.sitegoat.config';
const match=/(v6-future-atlas|v7-unified|v8-audit|v9-recurring-searches)\.spec\.ts/;
export default defineConfig({...config,testMatch:match,projects:config.projects!.map(p=>({...p,testMatch:match})),outputDir:'test-results-sitegoat-regressions'});

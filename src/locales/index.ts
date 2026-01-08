// [Korean Imports]
import commonKo from './ko/common';
import sidebarKo from './ko/sidebar';
import userKo from './ko/user';
import plantKo from './ko/plant';
import configKo from './ko/config';
import costKo from './ko/cost';
import masterKo from './ko/master';
import dashboardKo from './ko/dashboard';
import emptyKo from './ko/empty';

// [English Imports]
import commonEn from './en/common';
import sidebarEn from './en/sidebar';
import userEn from './en/user';
import plantEn from './en/plant';
import configEn from './en/config';
import costEn from './en/cost';
import masterEn from './en/master';
import dashboardEn from './en/dashboard';
import emptyEn from './en/empty';

import materialKo from './ko/material'; // ★ 추가
import materialEn from './en/material'; // ★ 추가

// Combine
export const translations = {
  ko: {
    ...commonKo,
    ...sidebarKo,
    ...userKo,
    ...plantKo,
    ...configKo,
    ...costKo,
    ...masterKo,
    ...dashboardKo,
    ...emptyKo,
    ...materialKo, // ★ 추가
  },
  en: {
    ...commonEn,
    ...sidebarEn,
    ...userEn,
    ...plantEn,
    ...configEn,
    ...costEn,
    ...masterEn,
    ...dashboardEn,
    ...emptyEn,
    ...materialEn, // ★ 추가
  }
};

type PlatformSelectOptions<T> = {
  android?: T;
  default?: T;
  ios?: T;
  native?: T;
  web?: T;
};

export const Platform = {
  OS: 'web',
  select<T>(options: PlatformSelectOptions<T>) {
    return options.web ?? options.default ?? options.native ?? options.ios ?? options.android;
  },
};

export default {
  Platform,
};

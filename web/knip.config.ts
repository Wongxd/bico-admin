import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  ignore: [
    'src/components/ui/**',
    'src/tanstack-table.d.ts',
  ],
  ignoreIssues: {
    'src/components/data-table/index.ts': ['exports'],
  },
}

export default config

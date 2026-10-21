/** Well-known puzzles with a unique solution, used across engine specs. */
export interface KnownPuzzle {
  readonly name: string;
  readonly puzzle: string;
  readonly solution: string;
}

export const KNOWN_PUZZLES: readonly KnownPuzzle[] = [
  {
    name: 'Wikipedia example',
    puzzle: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  },
  {
    name: 'Arto Inkala "world\'s hardest"',
    puzzle: '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
    solution: '812753649943682175675491283154237896369845721287169534521974368438526917796318452',
  },
  {
    name: 'Norvig hardest',
    puzzle: '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......',
    solution: '417369825632158947958724316825437169791586432346912758289643571573291684164875293',
  },
];

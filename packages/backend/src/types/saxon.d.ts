declare module 'saxon-js' {
  const SaxonJS: {
    transform: (options: {
      stylesheetText?: string
      sourceText?: string
      destination?: string
    }, config?: string) => {
        principalResult:string
    }
  }

  export default SaxonJS
}
/** Keep specific content together without depending on content-array positions. */
export function createPagination() {
  const followingContent = new Map();
  let nextId = 0;

  const identify = node => {
    node.id ??= `keep-${nextId++}`;
    return node.id;
  };

  return {
    /**
     * @param {{id?: string}} header
     * @param {{id?: string}} content
     */
    keepWith(header, content) {
      followingContent.set(identify(header), identify(content));
    },
    // pdfmake re-evaluates this after layout. Multi-page content may continue;
    // a single-page header moves when its intended following block is absent.
    /**
     * @param {{id?: string, pageNumbers: number[]}} node
     * @param {{id?: string}[]} followingNodesOnPage
     * @returns {boolean}
     */
    pageBreakBefore(node, followingNodesOnPage) {
      const target = followingContent.get(node.id);
      return target !== undefined
        && node.pageNumbers.length === 1
        && !followingNodesOnPage.some(following => following.id === target);
    },
  };
}

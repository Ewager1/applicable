import type {
  ContentText,
  ContentColumns,
  ContentStack,
  ContentUnorderedList,
  TDocumentDefinitions,
} from 'pdfmake/interfaces.js';

export type LayoutNode = (ContentText | ContentColumns | ContentStack | ContentUnorderedList) & {
  id?: string;
};
export interface KeepGroup {
  header: LayoutNode;
  content: LayoutNode;
  label: string;
}

/** Keep specific content together without depending on content-array positions. */
export function createPagination() {
  const followingContent = new Map<string, string>();
  const groups: KeepGroup[] = [];
  let nextId = 0;

  const identify = (node: LayoutNode) => {
    node.id ??= `keep-${nextId++}`;
    return node.id;
  };

  const pageBreakBefore: NonNullable<TDocumentDefinitions['pageBreakBefore']> = (
    node,
    followingNodesOnPage,
  ) => {
    const target = node.id === undefined ? undefined : followingContent.get(node.id);
    return (
      target !== undefined &&
      node.pageNumbers.length === 1 &&
      !followingNodesOnPage.some((following) => following.id === target)
    );
  };

  return {
    groups,
    keepWith(header: LayoutNode, content: LayoutNode, label = 'a resume heading') {
      followingContent.set(identify(header), identify(content));
      groups.push({ header, content, label });
    },
    // pdfmake re-evaluates this after layout; multi-page content may continue.
    pageBreakBefore,
  };
}

// TreeNode类单元测试
const { TreeNode } = require('../tree-cache.js');

module.exports = function(runner) {
  runner.describe('TreeNode类测试', () => {
    let treeNode;

    runner.beforeEach(() => {
      treeNode = new TreeNode('testNode');
    });

    runner.it('应该正确创建节点', () => {
      runner.expect(treeNode.name).toBe('testNode');
      runner.expect(treeNode.children).toEqual({});
    });

    runner.it('应该能够添加子节点', () => {
      const childNode = new TreeNode('childNode');
      treeNode.addChild(childNode);
      
      runner.expect(treeNode.children.childNode).toBe(childNode);
      runner.expect(treeNode.getChild('childNode')).toBe(childNode);
    });

    runner.it('应该能够获取子节点名称列表', () => {
      const child1 = new TreeNode('child1');
      const child2 = new TreeNode('child2');
      
      treeNode.addChild(child1);
      treeNode.addChild(child2);
      
      const childNames = treeNode.getChildNames();
      runner.expect(childNames).toContain('child1');
      runner.expect(childNames).toContain('child2');
      runner.expect(childNames.length).toBe(2);
    });

    runner.it('应该能够检查子节点是否存在', () => {
      const childNode = new TreeNode('childNode');
      treeNode.addChild(childNode);
      
      runner.expect(treeNode.hasChild('childNode')).toBe(true);
      runner.expect(treeNode.hasChild('nonExistent')).toBe(false);
    });

    runner.it('应该能够移除子节点', () => {
      const childNode = new TreeNode('childNode');
      treeNode.addChild(childNode);
      
      runner.expect(treeNode.hasChild('childNode')).toBe(true);
      
      const removeResult = treeNode.removeChild('childNode');
      runner.expect(removeResult).toBe(true);
      runner.expect(treeNode.hasChild('childNode')).toBe(false);
      
      const removeNonExistent = treeNode.removeChild('nonExistent');
      runner.expect(removeNonExistent).toBe(false);
    });

    runner.it('获取不存在的子节点应该返回undefined', () => {
      runner.expect(treeNode.getChild('nonExistent')).toBeUndefined();
    });
  });
};
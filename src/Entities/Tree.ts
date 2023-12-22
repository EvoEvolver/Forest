export default interface Tree {
    title: string;
    content: string;
    sections?: Tree[];
}
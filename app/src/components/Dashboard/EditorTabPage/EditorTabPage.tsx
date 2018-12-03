import React from 'react';
import { observer } from 'mobx-react';
import { Option } from 'funfix-core';
import { FieldChangeHandler } from '@vzh/mobx-stores';
import { EditorTab } from 'models';
import { DashboardStore } from 'stores';
import { ServerStructure } from 'services';
import DataDecorator from 'services/api/DataDecorator';
import Splitter from 'components/Splitter';
import SqlEditor from './SqlEditor';
import { ActionType as EditorActionType } from './SqlEditor/Toolbar';
import SaveModal from './SaveModal';
import Tabs from './Tabs';
import { ActionType as ResultActionType } from './Tabs/Actions';
import DataItemsLayout from './DataItemsLayout';
import DataTable from './DataTable';
import Draw from './Draw';
import Progress from './Progress';

interface Props {
  model: EditorTab;
  onTabModelFieldChange: FieldChangeHandler<EditorTab>;
  store: DashboardStore;
  width?: number;
}

@observer
export default class EditorTabPage extends React.Component<Props> {
  private onContentChange = (content: string) => {
    this.props.onTabModelFieldChange({ name: 'content', value: content });
  };

  private onDatabaseChange = (db: ServerStructure.Database) => {
    this.props.onTabModelFieldChange({ name: 'currentDatabase', value: Option.of(db.name) });
  };

  private setEditorRef = (editor: SqlEditor | null) => {
    this.props.onTabModelFieldChange({ name: 'codeEditor', value: Option.of(editor) });
  };

  private onEditorAction = (action: EditorActionType, eventData?: any) => {
    switch (action) {
      case EditorActionType.Save: {
        const { store } = this.props;
        store.uiStore.showSaveModal();
        break;
      }
      case EditorActionType.Fullscreen:
        break;
      case EditorActionType.RunCurrent:
      case EditorActionType.RunAll: {
        const { store } = this.props;
        store.execQueries(eventData);
        break;
      }
      default:
        break;
    }
  };

  private onResultAction = (action: ResultActionType) => {
    switch (action) {
      case ResultActionType.TogglePin: {
        const { onTabModelFieldChange, model } = this.props;
        onTabModelFieldChange({ name: 'pinnedResult', value: !model.pinnedResult });
        break;
      }
      default:
        break;
    }
  };

  private renderTable = (data: DataDecorator) => <DataTable data={data} fill />;

  private renderDraw = (data: DataDecorator) => <Draw data={data} />;

  render() {
    const { store, model, width } = this.props;
    const resultList = model.queriesResult.map(r => r.list).getOrElse([]);

    return (
      <React.Fragment>
        <Splitter split="horizontal" minSize={100} defaultSize={350}>
          <SqlEditor
            content={model.content}
            onContentChange={this.onContentChange}
            serverStructure={store.serverStructure.getOrElse(ServerStructure.EMPTY)}
            currentDatabase={model.currentDatabase.orUndefined()}
            onDatabaseChange={this.onDatabaseChange}
            onAction={this.onEditorAction}
            stats={model.queriesResult.map(_ => _.totalStats).orUndefined()}
            ref={this.setEditorRef}
            fill
          />

          <Tabs defaultActiveKey="table" pinned={model.pinnedResult} onAction={this.onResultAction}>
            <Tabs.TabPane key="table" tab="Table view">
              {!!store.uiStore.executingQueries.length && (
                <Progress queries={store.uiStore.executingQueries} />
              )}

              <DataItemsLayout
                cols={4}
                itemWidth={4}
                itemHeight={14}
                items={resultList}
                width={width}
                renderItem={this.renderTable}
                locked={model.pinnedResult}
              />
            </Tabs.TabPane>

            <Tabs.TabPane key="draw" tab="Draw view">
              {!!store.uiStore.executingQueries.length && (
                <Progress queries={store.uiStore.executingQueries} />
              )}

              <DataItemsLayout
                cols={4}
                itemWidth={4}
                itemHeight={6}
                items={resultList}
                width={width}
                renderItem={this.renderDraw}
              />
            </Tabs.TabPane>
          </Tabs>
        </Splitter>

        {store.uiStore.editedTab
          .filter(t => t.model === model)
          .map(editedTab => (
            <SaveModal
              fieldName="title"
              fieldValue={editedTab.title}
              onFieldChange={editedTab.changeField}
              onSave={store.saveEditedTab}
              onCancel={store.uiStore.hideSaveModal}
            />
          ))
          .orUndefined()}
      </React.Fragment>
    );
  }
}
